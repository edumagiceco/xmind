import type { LayoutNode, StructureType, Topic } from '../model/types';
import type { LayoutResult } from '../layout/types';
import { getTheme, getTopicStyle } from '../themes/ThemeEngine';
import type { MapSettings } from '../model/types';
import { jsPDF } from 'jspdf';

interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'markdown';
  padding?: number;
  scale?: number;
  backgroundColor?: string;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeBoundingBox(node: LayoutNode): BoundingBox {
  let box: BoundingBox = {
    minX: node.x,
    minY: node.y,
    maxX: node.x + node.width,
    maxY: node.y + node.height,
  };

  for (const child of node.children) {
    const childBox = computeBoundingBox(child);
    box = {
      minX: Math.min(box.minX, childBox.minX),
      minY: Math.min(box.minY, childBox.minY),
      maxX: Math.max(box.maxX, childBox.maxX),
      maxY: Math.max(box.maxY, childBox.maxY),
    };
  }

  return box;
}

// ===== PNG Export =====

export async function exportAsPng(
  layout: LayoutResult,
  themeId: string,
  structureType: StructureType,
  mapSettings?: MapSettings,
  options?: Partial<ExportOptions>,
): Promise<Blob> {
  const padding = options?.padding ?? 40;
  const scale = options?.scale ?? 2;
  const theme = getTheme(themeId);
  const bgColor = options?.backgroundColor ?? mapSettings?.backgroundColor ?? theme.canvas.backgroundColor ?? '#f5f5f5';

  const box = computeBoundingBox(layout.root);
  const width = (box.maxX - box.minX + padding * 2) * scale;
  const height = (box.maxY - box.minY + padding * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Transform: scale and translate so nodes are centered with padding
  ctx.scale(scale, scale);
  ctx.translate(-box.minX + padding, -box.minY + padding);

  // Render connections
  renderConnectionsToCtx(ctx, layout.root, theme, structureType, mapSettings);

  // Render nodes
  renderNodesToCtx(ctx, layout.root, theme, mapSettings);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

// ===== SVG Export =====

export function exportAsSvg(
  layout: LayoutResult,
  themeId: string,
  structureType: StructureType,
  mapSettings?: MapSettings,
  options?: Partial<ExportOptions>,
): string {
  const padding = options?.padding ?? 40;
  const theme = getTheme(themeId);
  const bgColor = options?.backgroundColor ?? mapSettings?.backgroundColor ?? theme.canvas.backgroundColor ?? '#f5f5f5';

  const box = computeBoundingBox(layout.root);
  const width = box.maxX - box.minX + padding * 2;
  const height = box.maxY - box.minY + padding * 2;
  const offsetX = -box.minX + padding;
  const offsetY = -box.minY + padding;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push(`<rect width="100%" height="100%" fill="${bgColor}"/>`);
  parts.push(`<g transform="translate(${offsetX},${offsetY})">`);

  // Connections
  buildSvgConnections(parts, layout.root, theme, structureType, mapSettings);

  // Nodes
  buildSvgNodes(parts, layout.root, theme, mapSettings);

  parts.push('</g>');
  parts.push('</svg>');

  return parts.join('\n');
}

// ===== PDF Export =====

export async function exportAsPdf(
  layout: LayoutResult,
  themeId: string,
  structureType: StructureType,
  mapSettings?: MapSettings,
  options?: Partial<ExportOptions>,
): Promise<Blob> {
  const padding = options?.padding ?? 40;
  const theme = getTheme(themeId);
  const bgColor = options?.backgroundColor ?? mapSettings?.backgroundColor ?? theme.canvas.backgroundColor ?? '#f5f5f5';

  const box = computeBoundingBox(layout.root);
  const mapWidth = box.maxX - box.minX + padding * 2;
  const mapHeight = box.maxY - box.minY + padding * 2;

  // Determine PDF orientation based on aspect ratio
  const orientation = mapWidth > mapHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [mapWidth, mapHeight] });

  // Background
  pdf.setFillColor(bgColor);
  pdf.rect(0, 0, mapWidth, mapHeight, 'F');

  const offsetX = -box.minX + padding;
  const offsetY = -box.minY + padding;

  // Render connections
  renderConnectionsToPdf(pdf, layout.root, theme, structureType, mapSettings, offsetX, offsetY);

  // Render nodes
  renderNodesToPdf(pdf, layout.root, theme, mapSettings, offsetX, offsetY);

  return pdf.output('blob');
}

// ===== Markdown Export =====

export function exportAsMarkdown(rootTopic: Topic): string {
  const lines: string[] = [];
  buildMarkdownNode(lines, rootTopic, 0);
  return lines.join('\n');
}

function buildMarkdownNode(lines: string[], topic: Topic, depth: number) {
  if (depth === 0) {
    lines.push(`# ${topic.title}`);
  } else if (depth === 1) {
    lines.push(`\n## ${topic.title}`);
  } else if (depth === 2) {
    lines.push(`\n### ${topic.title}`);
  } else {
    const indent = '  '.repeat(depth - 3);
    lines.push(`${indent}- ${topic.title}`);
  }

  // Add notes as blockquote
  if (topic.notes && topic.notes.length > 0) {
    const noteText = topic.notes
      .map((block) => block.children.map((span) => span.text).join(''))
      .join('\n');
    if (noteText.trim()) {
      lines.push('');
      for (const line of noteText.split('\n')) {
        lines.push(`> ${line}`);
      }
    }
  }

  for (const child of topic.children.attached) {
    buildMarkdownNode(lines, child, depth + 1);
  }
}

export function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}

// ===== Download helper =====

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSvg(svgContent: string, filename: string) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

// ===== Canvas rendering helpers (for PNG) =====

function renderConnectionsToCtx(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
  theme: ReturnType<typeof getTheme>,
  structureType: StructureType,
  mapSettings?: MapSettings,
) {
  for (const child of node.children) {
    const style = getTopicStyle(child, theme, mapSettings);
    const lineColor = style.lineColor ?? theme.connectionStyle.lineColor;
    const lineWidth = theme.connectionStyle.lineWidth;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const parentCenterY = node.y + node.height / 2;
    const childCenterY = child.y + child.height / 2;

    if (child.branchDirection === 'down' && structureType === 'tree-chart') {
      const trunkX = node.x + 8;
      const startY = node.y + node.height;
      const endY = child.y + child.height / 2;
      ctx.moveTo(trunkX, startY);
      ctx.lineTo(trunkX, endY);
      ctx.lineTo(child.x, endY);
    } else if (child.branchDirection === 'down') {
      const startX = node.x + node.width / 2;
      const startY = node.y + node.height;
      const endX = child.x + child.width / 2;
      const endY = child.y;
      const cpOffset = (endY - startY) / 2;
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(startX, startY + cpOffset, endX, endY - cpOffset, endX, endY);
    } else if (child.branchDirection === 'left') {
      const startX = node.x;
      const endX = child.x + child.width;
      const cpOffset = (startX - endX) / 2;
      ctx.moveTo(startX, parentCenterY);
      ctx.bezierCurveTo(startX - cpOffset, parentCenterY, endX + cpOffset, childCenterY, endX, childCenterY);
    } else {
      const startX = node.x + node.width;
      const endX = child.x;
      const cpOffset = (endX - startX) / 2;
      ctx.moveTo(startX, parentCenterY);
      ctx.bezierCurveTo(startX + cpOffset, parentCenterY, endX - cpOffset, childCenterY, endX, childCenterY);
    }

    ctx.stroke();
    renderConnectionsToCtx(ctx, child, theme, structureType, mapSettings);
  }
}

function renderNodesToCtx(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
  theme: ReturnType<typeof getTheme>,
  mapSettings?: MapSettings,
) {
  const style = getTopicStyle(node, theme, mapSettings);
  const { x, y, width, height } = node;
  const shape = style.shape ?? 'rounded-rect';

  // Fill
  if (shape !== 'underline') {
    ctx.beginPath();
    buildCanvasShapePath(ctx, x, y, width, height, shape);
    ctx.fillStyle = style.fillColor ?? '#ffffff';
    ctx.fill();

    // Border
    ctx.strokeStyle = style.borderColor ?? '#d0d0d0';
    ctx.lineWidth = style.borderWidth ?? 1;
    if (style.borderStyle === 'dashed') {
      ctx.setLineDash([6, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.strokeStyle = style.borderColor ?? '#d0d0d0';
    ctx.lineWidth = style.borderWidth ?? 1;
    ctx.stroke();
  }

  // Text
  const fontSize = style.fontSize ?? 14;
  const fontWeight = style.fontWeight ?? 'normal';
  const fontFamily = style.fontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = style.fontColor ?? '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.topic.title, x + width / 2, y + height / 2, width - 16);

  for (const child of node.children) {
    renderNodesToCtx(ctx, child, theme, mapSettings);
  }
}

function buildCanvasShapePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, shape: string) {
  switch (shape) {
    case 'rect':
      ctx.rect(x, y, w, h);
      break;
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'diamond': {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.moveTo(cx, cy - h * 0.6);
      ctx.lineTo(cx + w * 0.6, cy);
      ctx.lineTo(cx, cy + h * 0.6);
      ctx.lineTo(cx - w * 0.6, cy);
      ctx.closePath();
      break;
    }
    case 'capsule':
      roundedRect(ctx, x, y, w, h, h / 2);
      break;
    case 'parallelogram': {
      const skew = 10;
      ctx.moveTo(x + skew, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - skew, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    }
    case 'rounded-rect':
    default:
      roundedRect(ctx, x, y, w, h, 6);
      break;
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===== SVG rendering helpers =====

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSvgConnections(
  parts: string[],
  node: LayoutNode,
  theme: ReturnType<typeof getTheme>,
  structureType: StructureType,
  mapSettings?: MapSettings,
) {
  for (const child of node.children) {
    const style = getTopicStyle(child, theme, mapSettings);
    const lineColor = style.lineColor ?? theme.connectionStyle.lineColor;
    const lineWidth = theme.connectionStyle.lineWidth;

    const parentCenterY = node.y + node.height / 2;
    const childCenterY = child.y + child.height / 2;
    let d: string;

    if (child.branchDirection === 'down' && structureType === 'tree-chart') {
      const trunkX = node.x + 8;
      const startY = node.y + node.height;
      const endY = child.y + child.height / 2;
      d = `M${trunkX},${startY} L${trunkX},${endY} L${child.x},${endY}`;
    } else if (child.branchDirection === 'down') {
      const startX = node.x + node.width / 2;
      const startY = node.y + node.height;
      const endX = child.x + child.width / 2;
      const endY = child.y;
      const cpOffset = (endY - startY) / 2;
      d = `M${startX},${startY} C${startX},${startY + cpOffset} ${endX},${endY - cpOffset} ${endX},${endY}`;
    } else if (child.branchDirection === 'left') {
      const startX = node.x;
      const endX = child.x + child.width;
      const cpOffset = (startX - endX) / 2;
      d = `M${startX},${parentCenterY} C${startX - cpOffset},${parentCenterY} ${endX + cpOffset},${childCenterY} ${endX},${childCenterY}`;
    } else {
      const startX = node.x + node.width;
      const endX = child.x;
      const cpOffset = (endX - startX) / 2;
      d = `M${startX},${parentCenterY} C${startX + cpOffset},${parentCenterY} ${endX - cpOffset},${childCenterY} ${endX},${childCenterY}`;
    }

    parts.push(`<path d="${d}" fill="none" stroke="${lineColor}" stroke-width="${lineWidth}"/>`);
    buildSvgConnections(parts, child, theme, structureType, mapSettings);
  }
}

function buildSvgNodes(
  parts: string[],
  node: LayoutNode,
  theme: ReturnType<typeof getTheme>,
  mapSettings?: MapSettings,
) {
  const style = getTopicStyle(node, theme, mapSettings);
  const { x, y, width, height } = node;
  const shape = style.shape ?? 'rounded-rect';
  const fill = style.fillColor ?? '#ffffff';
  const borderColor = style.borderColor ?? '#d0d0d0';
  const borderWidth = style.borderWidth ?? 1;
  const dashArray = style.borderStyle === 'dashed' ? ' stroke-dasharray="6,3"' : '';

  // Shape
  if (shape === 'underline') {
    parts.push(`<line x1="${x}" y1="${y + height}" x2="${x + width}" y2="${y + height}" stroke="${borderColor}" stroke-width="${borderWidth}"${dashArray}/>`);
  } else if (shape === 'ellipse') {
    parts.push(`<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" stroke="${borderColor}" stroke-width="${borderWidth}"${dashArray}/>`);
  } else if (shape === 'rect') {
    parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${borderColor}" stroke-width="${borderWidth}"${dashArray}/>`);
  } else if (shape === 'capsule') {
    parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${fill}" stroke="${borderColor}" stroke-width="${borderWidth}"${dashArray}/>`);
  } else {
    // rounded-rect default
    parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${fill}" stroke="${borderColor}" stroke-width="${borderWidth}"${dashArray}/>`);
  }

  // Text
  const fontSize = style.fontSize ?? 14;
  const fontWeight = style.fontWeight ?? 'normal';
  const fontColor = style.fontColor ?? '#1a1a1a';
  parts.push(`<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fontColor}" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(node.topic.title)}</text>`);

  for (const child of node.children) {
    buildSvgNodes(parts, child, theme, mapSettings);
  }
}

// ===== PDF rendering helpers =====

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function renderConnectionsToPdf(
  pdf: jsPDF,
  node: LayoutNode,
  theme: ReturnType<typeof getTheme>,
  structureType: StructureType,
  mapSettings: MapSettings | undefined,
  ox: number,
  oy: number,
) {
  for (const child of node.children) {
    const style = getTopicStyle(child, theme, mapSettings);
    const lineColor = style.lineColor ?? theme.connectionStyle.lineColor;
    const lineWidth = theme.connectionStyle.lineWidth;
    const [r, g, b] = hexToRgb(lineColor);

    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(lineWidth);

    const px = node.x + ox;
    const py = node.y + oy;
    const cx = child.x + ox;
    const cy = child.y + oy;

    // Simplified: draw straight lines for PDF (bezier not natively supported in basic jsPDF)
    if (child.branchDirection === 'down') {
      const startX = px + node.width / 2;
      const startY = py + node.height;
      const endX = cx + child.width / 2;
      const endY = cy;
      pdf.line(startX, startY, endX, endY);
    } else if (child.branchDirection === 'left') {
      const startX = px;
      const endX = cx + child.width;
      pdf.line(startX, py + node.height / 2, endX, cy + child.height / 2);
    } else {
      const startX = px + node.width;
      const endX = cx;
      pdf.line(startX, py + node.height / 2, endX, cy + child.height / 2);
    }

    renderConnectionsToPdf(pdf, child, theme, structureType, mapSettings, ox, oy);
  }
}

function renderNodesToPdf(
  pdf: jsPDF,
  node: LayoutNode,
  theme: ReturnType<typeof getTheme>,
  mapSettings: MapSettings | undefined,
  ox: number,
  oy: number,
) {
  const style = getTopicStyle(node, theme, mapSettings);
  const x = node.x + ox;
  const y = node.y + oy;
  const { width, height } = node;
  const shape = style.shape ?? 'rounded-rect';

  // Fill
  const fillColor = style.fillColor ?? '#ffffff';
  const [fr, fg, fb] = hexToRgb(fillColor);
  pdf.setFillColor(fr, fg, fb);

  const borderColor = style.borderColor ?? '#d0d0d0';
  const [br, bg, bb] = hexToRgb(borderColor);
  pdf.setDrawColor(br, bg, bb);
  pdf.setLineWidth(style.borderWidth ?? 1);

  if (shape === 'ellipse') {
    pdf.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 'FD');
  } else if (shape === 'underline') {
    pdf.line(x, y + height, x + width, y + height);
  } else {
    // rect/rounded-rect/capsule/etc → rounded rect
    const radius = shape === 'capsule' ? height / 2 : shape === 'rect' ? 0 : 6;
    if (radius > 0) {
      pdf.roundedRect(x, y, width, height, radius, radius, 'FD');
    } else {
      pdf.rect(x, y, width, height, 'FD');
    }
  }

  // Text
  const fontSize = style.fontSize ?? 14;
  const fontColor = style.fontColor ?? '#1a1a1a';
  const [tr, tg, tb] = hexToRgb(fontColor);
  pdf.setTextColor(tr, tg, tb);
  pdf.setFontSize(fontSize);
  pdf.text(node.topic.title, x + width / 2, y + height / 2, {
    align: 'center',
    baseline: 'middle',
    maxWidth: width - 16,
  });

  for (const child of node.children) {
    renderNodesToPdf(pdf, child, theme, mapSettings, ox, oy);
  }
}
