import type { LayoutNode, TopicStyle, MapSettings } from '../model/types';
import type { LayoutResult } from '../layout/types';
import { Camera } from './Camera';
import { getTopicStyle, getTheme } from '../themes/ThemeEngine';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  camera: Camera;
  private dpr: number;
  private animationId: number | null = null;
  private layout: LayoutResult | null = null;
  private selectedIds: Set<string> = new Set();
  private editingId: string | null = null;
  private hoveredId: string | null = null;
  private themeId = 'default';
  private mapSettings: MapSettings | undefined;
  private needsRender = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.needsRender = true;
  }

  setLayout(layout: LayoutResult) {
    this.layout = layout;
    this.needsRender = true;
  }

  setSelection(ids: string[]) {
    this.selectedIds = new Set(ids);
    this.needsRender = true;
  }

  setEditingId(id: string | null) {
    this.editingId = id;
    this.needsRender = true;
  }

  setHoveredId(id: string | null) {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.needsRender = true;
  }

  setTheme(themeId: string) {
    this.themeId = themeId;
    this.needsRender = true;
  }

  setMapSettings(settings: MapSettings | undefined) {
    this.mapSettings = settings;
    this.needsRender = true;
  }

  requestRender() {
    this.needsRender = true;
  }

  start() {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private render() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const theme = getTheme(this.themeId);

    const cw = w / this.dpr;
    const ch = h / this.dpr;

    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(this.dpr, this.dpr);
    const bgColor = this.mapSettings?.backgroundColor || theme.canvas.backgroundColor || '#f5f5f5';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);

    if (!this.layout) return;

    // Apply camera transform (include DPR so Retina displays render correctly)
    this.camera.applyTransform(ctx, cw, ch, this.dpr);

    // Draw connections first (below nodes)
    this.renderConnections(this.layout.root, theme.connectionStyle.lineColor);

    // Draw all nodes
    this.renderNodes(this.layout.root);
  }

  private renderConnections(node: LayoutNode, _defaultColor: string) {
    const theme = getTheme(this.themeId);

    for (const child of node.children) {
      const style = getTopicStyle(child, theme, this.mapSettings);
      const lineColor = style.lineColor ?? theme.connectionStyle.lineColor;
      const lineWidth = theme.connectionStyle.lineWidth;

      this.ctx.strokeStyle = lineColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();

      const parentCenterY = node.y + node.height / 2;
      const childCenterY = child.y + child.height / 2;

      if (child.branchDirection === 'down') {
        const startX = node.x + node.width / 2;
        const startY = node.y + node.height;
        const endX = child.x + child.width / 2;
        const endY = child.y;
        const cpOffset = (endY - startY) / 2;

        this.ctx.moveTo(startX, startY);
        this.ctx.bezierCurveTo(
          startX, startY + cpOffset,
          endX, endY - cpOffset,
          endX, endY,
        );
      } else if (child.branchDirection === 'left') {
        const startX = node.x;
        const endX = child.x + child.width;
        const cpOffset = (startX - endX) / 2;

        this.ctx.moveTo(startX, parentCenterY);
        this.ctx.bezierCurveTo(
          startX - cpOffset, parentCenterY,
          endX + cpOffset, childCenterY,
          endX, childCenterY,
        );
      } else {
        const startX = node.x + node.width;
        const endX = child.x;
        const cpOffset = (endX - startX) / 2;

        this.ctx.moveTo(startX, parentCenterY);
        this.ctx.bezierCurveTo(
          startX + cpOffset, parentCenterY,
          endX - cpOffset, childCenterY,
          endX, childCenterY,
        );
      }

      this.ctx.stroke();

      // Recurse
      this.renderConnections(child, lineColor);
    }
  }

  private renderNodes(node: LayoutNode) {
    const theme = getTheme(this.themeId);
    const style = getTopicStyle(node, theme, this.mapSettings);
    const isSelected = this.selectedIds.has(node.id);
    const isEditing = this.editingId === node.id;
    const isHovered = this.hoveredId === node.id;

    this.renderNodeShape(node, style, isSelected, isHovered);

    // Render text (skip if editing — the overlay input handles text)
    if (!isEditing) {
      this.renderNodeText(node, style);
    }

    // Render collapse/expand indicator
    if (node.topic.children.attached.length > 0) {
      this.renderCollapseIndicator(node, style, !!node.topic.collapsed, isHovered);
    }

    // Render add-child "+" button on hover (MindNode-style node well)
    if (isHovered && !isEditing) {
      this.renderAddButton(node, style);
    }

    // Recurse to children
    for (const child of node.children) {
      this.renderNodes(child);
    }
  }

  private renderNodeShape(node: LayoutNode, style: TopicStyle, isSelected: boolean, isHovered: boolean) {
    const { ctx } = this;
    const { x, y, width, height } = node;
    const shape = style.shape ?? 'rounded-rect';
    const isUnderline = shape === 'underline';

    // Build shape path (except underline which is special)
    if (!isUnderline) {
      ctx.beginPath();
      this.buildShapePath(x, y, width, height, shape);

      // Fill
      ctx.fillStyle = style.fillColor ?? '#ffffff';
      ctx.fill();
    }

    // Border
    if (isSelected) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
    } else if (isHovered) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = style.borderColor ?? '#d0d0d0';
      ctx.lineWidth = style.borderWidth ?? 1;
    }

    if (style.borderStyle === 'dashed') {
      ctx.setLineDash([6, 3]);
    } else {
      ctx.setLineDash([]);
    }

    if (isUnderline) {
      // Underline: just draw a line at the bottom
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
    } else {
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Selection glow
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      if (isUnderline) {
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
      } else {
        ctx.beginPath();
        this.buildShapePath(x, y, width, height, shape);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** Build a canvas path for the given shape type */
  private buildShapePath(x: number, y: number, w: number, h: number, shape: string) {
    const { ctx } = this;
    switch (shape) {
      case 'rect':
        ctx.rect(x, y, w, h);
        break;
      case 'ellipse': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;
      }
      case 'diamond': {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const dx = w * 0.6;
        const dy = h * 0.6;
        ctx.moveTo(cx, cy - dy);
        ctx.lineTo(cx + dx, cy);
        ctx.lineTo(cx, cy + dy);
        ctx.lineTo(cx - dx, cy);
        ctx.closePath();
        break;
      }
      case 'capsule':
        this.roundedRect(x, y, w, h, h / 2);
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
        this.roundedRect(x, y, w, h, 6);
        break;
    }
  }

  private renderNodeText(node: LayoutNode, style: TopicStyle) {
    const { ctx } = this;
    const fontSize = style.fontSize ?? 14;
    const fontWeight = style.fontWeight ?? 'normal';
    const fontFamily = style.fontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = style.fontColor ?? '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
      node.topic.title,
      node.x + node.width / 2,
      node.y + node.height / 2,
      node.width - 16,
    );
  }

  private renderCollapseIndicator(node: LayoutNode, style: TopicStyle, isCollapsed: boolean, isHovered: boolean) {
    const { ctx } = this;
    const r = 8;
    const count = node.topic.children.attached.length;

    // Position on the child side of the node
    let cx: number, cy: number;
    if (node.branchDirection === 'down') {
      cx = node.x + node.width / 2;
      cy = node.y + node.height + 4;
    } else if (node.branchDirection === 'left') {
      cx = node.x - 4;
      cy = node.y + node.height / 2;
    } else {
      cx = node.x + node.width + 4;
      cy = node.y + node.height / 2;
    }

    const color = style.lineColor ?? '#4a90d9';

    if (isCollapsed) {
      // Collapsed: always show filled badge with child count
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(count), cx, cy);
    } else if (isHovered) {
      // Expanded + hovered: show outline circle with "−"
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Minus sign
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy);
      ctx.lineTo(cx + 4, cy);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // When expanded and not hovered: show nothing (clean look)
  }

  /** Render "+" button on the child side of a hovered node */
  private renderAddButton(node: LayoutNode, style: TopicStyle) {
    const { ctx } = this;
    const r = 9;
    const color = style.lineColor ?? '#4a90d9';

    // Position further out than collapse indicator
    const hasChildren = node.topic.children.attached.length > 0;
    const offset = hasChildren ? 22 : 8;
    let cx: number, cy: number;
    if (node.branchDirection === 'down') {
      cx = node.x + node.width / 2;
      cy = node.y + node.height + offset;
    } else if (node.branchDirection === 'left') {
      cx = node.x - offset;
      cy = node.y + node.height / 2;
    } else {
      cx = node.x + node.width + offset;
      cy = node.y + node.height / 2;
    }

    // Circle background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Plus sign
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
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

  // ===== Hit Testing =====

  /** Hit test: find which topic is at the given world coordinates */
  hitTest(worldX: number, worldY: number): string | null {
    if (!this.layout) return null;
    return this.hitTestNode(this.layout.root, worldX, worldY);
  }

  /** Hit test for collapse indicator */
  hitTestCollapse(worldX: number, worldY: number): string | null {
    if (!this.layout) return null;
    return this.hitTestCollapseNode(this.layout.root, worldX, worldY);
  }

  /** Hit test for "+" add button */
  hitTestAddButton(worldX: number, worldY: number): string | null {
    if (!this.layout) return null;
    return this.hitTestAddNode(this.layout.root, worldX, worldY);
  }

  private hitTestAddNode(node: LayoutNode, wx: number, wy: number): string | null {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = this.hitTestAddNode(node.children[i], wx, wy);
      if (hit) return hit;
    }

    // Only check hovered node's add button
    if (node.id !== this.hoveredId) return null;

    const r = 13;
    const hasChildren = node.topic.children.attached.length > 0;
    const offset = hasChildren ? 22 : 8;
    let cx: number, cy: number;
    if (node.branchDirection === 'down') {
      cx = node.x + node.width / 2;
      cy = node.y + node.height + offset;
    } else if (node.branchDirection === 'left') {
      cx = node.x - offset;
      cy = node.y + node.height / 2;
    } else {
      cx = node.x + node.width + offset;
      cy = node.y + node.height / 2;
    }

    const dx = wx - cx;
    const dy = wy - cy;
    if (dx * dx + dy * dy <= r * r) {
      return node.id;
    }

    return null;
  }

  private hitTestCollapseNode(node: LayoutNode, wx: number, wy: number): string | null {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = this.hitTestCollapseNode(node.children[i], wx, wy);
      if (hit) return hit;
    }

    if (node.topic.children.attached.length > 0) {
      const r = 12;
      let cx: number, cy: number;
      if (node.branchDirection === 'down') {
        cx = node.x + node.width / 2;
        cy = node.y + node.height + 4;
      } else if (node.branchDirection === 'left') {
        cx = node.x - 4;
        cy = node.y + node.height / 2;
      } else {
        cx = node.x + node.width + 4;
        cy = node.y + node.height / 2;
      }

      const dx = wx - cx;
      const dy = wy - cy;
      if (dx * dx + dy * dy <= r * r) {
        return node.id;
      }
    }

    return null;
  }

  private hitTestNode(node: LayoutNode, wx: number, wy: number): string | null {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = this.hitTestNode(node.children[i], wx, wy);
      if (hit) return hit;
    }

    if (
      wx >= node.x &&
      wx <= node.x + node.width &&
      wy >= node.y &&
      wy <= node.y + node.height
    ) {
      return node.id;
    }

    return null;
  }

  /** Measure text for layout engine */
  measureText(text: string, fontSize: number, fontWeight: string): { width: number; height: number } {
    const fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = this.ctx.measureText(text);
    return {
      width: metrics.width,
      height: fontSize * 1.4,
    };
  }

  get canvasWidth() {
    return this.canvas.width / this.dpr;
  }

  get canvasHeight() {
    return this.canvas.height / this.dpr;
  }
}
