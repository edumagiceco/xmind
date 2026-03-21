import type { LayoutNode, TopicStyle, MapSettings, StructureType, Relationship } from '../model/types';
import type { LayoutResult } from '../layout/types';
import { Camera } from './Camera';
import { getTopicStyle, getTheme } from '../themes/ThemeEngine';
import { getMarkerIcon } from '../model/markers';
import { Quadtree, buildQuadtree } from './Quadtree';

/** Half the horizontal gap between parent and child — used as bracket trunk offset */
const LOGIC_CHART_BRACKET_GAP = 30;

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
  private structureType: StructureType = 'mind-map';
  private relationships: Relationship[] = [];
  private quadtree: Quadtree | null = null;
  private viewportBounds = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };
  private needsRender = true;

  // Drag state
  private dragId: string | null = null;
  private dragWorldX = 0;
  private dragWorldY = 0;
  private dropTargetId: string | null = null;
  private dropPosition: 'child' | 'before' | 'after' | null = null;

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
    this.quadtree = buildQuadtree(layout.nodes);
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

  setStructureType(type: StructureType) {
    this.structureType = type;
    this.needsRender = true;
  }

  setRelationships(rels: Relationship[]) {
    this.relationships = rels;
    this.needsRender = true;
  }

  setDragState(dragId: string | null, worldX = 0, worldY = 0) {
    this.dragId = dragId;
    this.dragWorldX = worldX;
    this.dragWorldY = worldY;
    this.needsRender = true;
  }

  updateDragPosition(worldX: number, worldY: number) {
    this.dragWorldX = worldX;
    this.dragWorldY = worldY;
    this.needsRender = true;
  }

  setDropTarget(targetId: string | null, position: 'child' | 'before' | 'after' | null) {
    if (this.dropTargetId === targetId && this.dropPosition === position) return;
    this.dropTargetId = targetId;
    this.dropPosition = position;
    this.needsRender = true;
  }

  clearDragState() {
    this.dragId = null;
    this.dropTargetId = null;
    this.dropPosition = null;
    this.needsRender = true;
  }

  /** Find the best drop target at given world coordinates */
  findDropTarget(worldX: number, worldY: number, draggedId: string): {
    targetId: string;
    position: 'child' | 'before' | 'after';
  } | null {
    if (!this.layout) return null;
    // Collect all IDs in the dragged subtree to prevent circular drops
    const draggedNode = this.layout.nodes.get(draggedId);
    const excludeIds = new Set<string>();
    if (draggedNode) {
      this.collectSubtreeIds(draggedNode, excludeIds);
    }
    return this.findDropInNode(this.layout.root, worldX, worldY, excludeIds);
  }

  /** Collect all node IDs in a subtree */
  private collectSubtreeIds(node: LayoutNode, ids: Set<string>) {
    ids.add(node.id);
    for (const child of node.children) {
      this.collectSubtreeIds(child, ids);
    }
  }

  private findDropInNode(
    node: LayoutNode,
    wx: number,
    wy: number,
    excludeIds: Set<string>,
  ): { targetId: string; position: 'child' | 'before' | 'after' } | null {
    // Skip the entire dragged subtree
    if (excludeIds.has(node.id)) return null;

    // Check children first (front-to-back)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const result = this.findDropInNode(node.children[i], wx, wy, excludeIds);
      if (result) return result;
    }

    const { x, y, width, height } = node;
    const inX = wx >= x - 10 && wx <= x + width + 10;
    const inY = wy >= y - 10 && wy <= y + height + 10;

    if (inX && inY) {
      // Determine drop position based on structure type and branch direction
      const isVertical = this.structureType === 'org-chart' || this.structureType === 'tree-chart';

      if (isVertical) {
        // Vertical layouts: use Y axis for before/after (top/bottom edges)
        const relY = (wy - y) / height;
        if (relY < 0.25) {
          return { targetId: node.id, position: 'before' };
        } else if (relY > 0.75) {
          return { targetId: node.id, position: 'after' };
        } else {
          return { targetId: node.id, position: 'child' };
        }
      } else {
        // Horizontal layouts (mind-map, logic-chart): use X axis
        // For left-branch nodes, directions are flipped
        const isLeftBranch = node.branchDirection === 'left';
        const relX = (wx - x) / width;

        if (isLeftBranch) {
          // Left branch: right edge = before (closer to parent), left = after (away from parent)
          if (relX > 0.75) {
            return { targetId: node.id, position: 'before' };
          } else if (relX < 0.25) {
            return { targetId: node.id, position: 'after' };
          }
        } else {
          // Right branch / default: use Y axis for sibling order since siblings stack vertically
          const relY = (wy - y) / height;
          if (relY < 0.25) {
            return { targetId: node.id, position: 'before' };
          } else if (relY > 0.75) {
            return { targetId: node.id, position: 'after' };
          }
        }
        return { targetId: node.id, position: 'child' };
      }
    }

    return null;
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

    // Compute viewport bounds in world coordinates for culling
    const viewMargin = 100;
    const topLeft = this.camera.screenToWorld(-viewMargin, -viewMargin, cw, ch);
    const bottomRight = this.camera.screenToWorld(cw + viewMargin, ch + viewMargin, cw, ch);
    this.viewportBounds = { minX: topLeft.x, minY: topLeft.y, maxX: bottomRight.x, maxY: bottomRight.y };

    // Draw connections first (below nodes)
    this.renderConnections(this.layout.root, theme.connectionStyle.lineColor);

    // Draw all nodes (with viewport culling)
    this.renderNodes(this.layout.root);

    // Draw relationships
    this.renderRelationships();

    // Draw drag feedback
    if (this.dragId) {
      if (this.dropTargetId && this.dropPosition) {
        this.renderDropIndicator();
      }
      this.renderDragGhost();
    }
  }

  private renderConnections(node: LayoutNode, _defaultColor: string) {
    const theme = getTheme(this.themeId);

    // Logic Chart: bracket/elbow-style orthogonal connections (batch per parent)
    if (this.structureType === 'logic-chart' && node.children.length > 0) {
      const style = getTopicStyle(node.children[0], theme, this.mapSettings);
      const lineColor = style.lineColor ?? theme.connectionStyle.lineColor;
      const lineWidth = theme.connectionStyle.lineWidth;

      this.ctx.strokeStyle = lineColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();

      const parentCenterY = node.y + node.height / 2;
      const startX = node.x + node.width;
      const midX = startX + LOGIC_CHART_BRACKET_GAP;

      // Horizontal line from parent right edge to vertical trunk
      this.ctx.moveTo(startX, parentCenterY);
      this.ctx.lineTo(midX, parentCenterY);

      // Vertical trunk spanning all children
      const firstChildCenterY = node.children[0].y + node.children[0].height / 2;
      const lastChildCenterY = node.children[node.children.length - 1].y + node.children[node.children.length - 1].height / 2;
      this.ctx.moveTo(midX, firstChildCenterY);
      this.ctx.lineTo(midX, lastChildCenterY);

      // Horizontal lines from trunk to each child
      for (const child of node.children) {
        const childCenterY = child.y + child.height / 2;
        this.ctx.moveTo(midX, childCenterY);
        this.ctx.lineTo(child.x, childCenterY);
      }

      this.ctx.stroke();

      // Recurse into children
      for (const child of node.children) {
        this.renderConnections(child, lineColor);
      }
      return;
    }

    for (const child of node.children) {
      const style = getTopicStyle(child, theme, this.mapSettings);
      const lineColor = style.lineColor ?? theme.connectionStyle.lineColor;
      const lineWidth = theme.connectionStyle.lineWidth;

      this.ctx.strokeStyle = lineColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();

      const parentCenterY = node.y + node.height / 2;
      const childCenterY = child.y + child.height / 2;

      if (child.branchDirection === 'down' && this.structureType === 'tree-chart') {
        // Tree Chart: orthogonal L-shaped lines
        const trunkX = node.x + 8;
        const startY = node.y + node.height;
        const endY = child.y + child.height / 2;

        this.ctx.moveTo(trunkX, startY);
        this.ctx.lineTo(trunkX, endY);
        this.ctx.lineTo(child.x, endY);
      } else if (child.branchDirection === 'down') {
        // Org Chart: bezier curves from center bottom
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

  private isInViewport(node: LayoutNode): boolean {
    const vb = this.viewportBounds;
    return !(node.x + node.width < vb.minX || node.x > vb.maxX ||
             node.y + node.height < vb.minY || node.y > vb.maxY);
  }

  private renderNodes(node: LayoutNode) {
    const theme = getTheme(this.themeId);
    const style = getTopicStyle(node, theme, this.mapSettings);
    const isSelected = this.selectedIds.has(node.id);
    const isEditing = this.editingId === node.id;
    const isHovered = this.hoveredId === node.id;
    const isBeingDragged = this.dragId === node.id;
    const isDropTarget = this.dropTargetId === node.id && this.dropPosition === 'child';
    const visible = this.isInViewport(node);

    // Skip rendering if off-screen (but still recurse children)
    if (!visible) {
      for (const child of node.children) {
        this.renderNodes(child);
      }
      return;
    }

    // Dim the dragged node
    if (isBeingDragged) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
    }

    // Highlight drop target
    if (isDropTarget) {
      this.ctx.save();
      this.ctx.strokeStyle = '#2563eb';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([6, 4]);
      this.ctx.beginPath();
      this.roundedRect(node.x - 4, node.y - 4, node.width + 8, node.height + 8, 10);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.restore();
    }

    this.renderNodeShape(node, style, isSelected, isHovered);

    // Render text (skip if editing — the overlay input handles text)
    if (!isEditing) {
      this.renderNodeText(node, style);
    }

    // Render markers
    if (node.topic.markers.length > 0) {
      this.renderMarkers(node);
    }

    // Render hyperlink indicator
    if (node.topic.hyperlink) {
      this.renderHyperlinkIndicator(node);
    }

    // Render notes indicator
    if (node.topic.notes && node.topic.notes.length > 0) {
      this.renderNotesIndicator(node);
    }

    // Render collapse/expand indicator
    if (node.topic.children.attached.length > 0) {
      this.renderCollapseIndicator(node, style, !!node.topic.collapsed, isHovered);
    }

    // Render add-child "+" button on hover (MindNode-style node well)
    if (isHovered && !isEditing) {
      this.renderAddButton(node, style);
    }

    // Restore alpha if this was the dragged node
    if (isBeingDragged) {
      this.ctx.restore();
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

  /** Render relationship lines between topics */
  private renderRelationships() {
    if (!this.layout || this.relationships.length === 0) return;
    const { ctx } = this;

    for (const rel of this.relationships) {
      const startNode = this.layout.nodes.get(rel.startTopicId);
      const endNode = this.layout.nodes.get(rel.endTopicId);
      if (!startNode || !endNode) continue;

      const sx = startNode.x + startNode.width / 2;
      const sy = startNode.y + startNode.height / 2;
      const ex = endNode.x + endNode.width / 2;
      const ey = endNode.y + endNode.height / 2;

      const lineColor = rel.style?.lineColor ?? '#ff6b6b';
      const lineWidth = rel.style?.lineWidth ?? 2;

      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([8, 4]);
      ctx.globalAlpha = 0.8;

      // Draw curved line
      const cpX = (sx + ex) / 2;
      const cpY = Math.min(sy, ey) - 40;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpX, cpY, ex, ey);
      ctx.stroke();

      // Arrow at end
      if (rel.style?.arrowEnd !== false) {
        const angle = Math.atan2(ey - cpY, ex - cpX);
        const arrowLen = 10;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowLen * Math.cos(angle - 0.4), ey - arrowLen * Math.sin(angle - 0.4));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowLen * Math.cos(angle + 0.4), ey - arrowLen * Math.sin(angle + 0.4));
        ctx.stroke();
      }

      // Label
      if (rel.title) {
        ctx.setLineDash([]);
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = lineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(rel.title, cpX, cpY - 4);
      }

      ctx.restore();
    }
  }

  /** Render drop indicator line for before/after positions */
  private renderDropIndicator() {
    if (!this.layout || !this.dropTargetId || !this.dropPosition || this.dropPosition === 'child') return;

    const node = this.layout.nodes.get(this.dropTargetId);
    if (!node) return;

    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#2563eb';

    // Siblings always stack vertically in all current layout algorithms
    let lineY: number;
    if (this.dropPosition === 'before') {
      const prev = this.findPreviousSibling(node);
      lineY = prev ? (prev.y + prev.height + node.y) / 2 : node.y - 8;
    } else {
      const next = this.findNextSibling(node);
      lineY = next ? (node.y + node.height + next.y) / 2 : node.y + node.height + 8;
    }

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(node.x, lineY);
    ctx.lineTo(node.x + node.width, lineY);
    ctx.stroke();

    // Circle endpoints
    ctx.beginPath();
    ctx.arc(node.x, lineY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.x + node.width, lineY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** Find previous sibling layout node */
  private findPreviousSibling(node: LayoutNode): LayoutNode | null {
    if (!node.parent) return null;
    const siblings = node.parent.children;
    const idx = siblings.findIndex(s => s.id === node.id);
    return idx > 0 ? siblings[idx - 1] : null;
  }

  /** Find next sibling layout node */
  private findNextSibling(node: LayoutNode): LayoutNode | null {
    if (!node.parent) return null;
    const siblings = node.parent.children;
    const idx = siblings.findIndex(s => s.id === node.id);
    return idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  }

  /** Render a ghost of the dragged node at the cursor position */
  private renderDragGhost() {
    if (!this.layout || !this.dragId) return;
    const node = this.layout.nodes.get(this.dragId);
    if (!node) return;

    const { ctx } = this;
    const theme = getTheme(this.themeId);
    const style = getTopicStyle(node, theme, this.mapSettings);

    // Draw at drag world position, offset so cursor is at center
    const gx = this.dragWorldX - node.width / 2;
    const gy = this.dragWorldY - node.height / 2;

    ctx.save();
    ctx.globalAlpha = 0.6;

    // Shape
    const shape = style.shape ?? 'rounded-rect';
    if (shape !== 'underline') {
      ctx.beginPath();
      this.buildShapePath(gx, gy, node.width, node.height, shape);
      ctx.fillStyle = style.fillColor ?? '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
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
    ctx.fillText(node.topic.title, gx + node.width / 2, gy + node.height / 2, node.width - 16);

    ctx.restore();
  }

  /** Render marker emojis to the left of the node text */
  private renderMarkers(node: LayoutNode) {
    const { ctx } = this;
    const markers = node.topic.markers;
    const size = 12;
    const gap = 2;
    const startX = node.x + 4;
    const centerY = node.y + node.height / 2;

    ctx.save();
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let offsetX = 0;
    for (const marker of markers) {
      const icon = getMarkerIcon(marker.groupId, marker.markerId);
      if (icon) {
        ctx.fillText(icon, startX + offsetX, centerY);
        offsetX += size + gap;
      }
    }
    ctx.restore();
  }

  /** Render a small link icon at the bottom-right corner */
  private renderHyperlinkIndicator(node: LayoutNode) {
    const { ctx } = this;
    const ix = node.x + node.width - 6;
    const iy = node.y + node.height - 12;

    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.globalAlpha = 0.8;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔗', ix + 4, iy + 4);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Render a small notes icon at the top-right corner of a node */
  private renderNotesIndicator(node: LayoutNode) {
    const { ctx } = this;
    const ix = node.x + node.width - 6;
    const iy = node.y + 4;
    const s = 8;

    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.globalAlpha = 0.85;

    // Small folded note icon
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + s, iy);
    ctx.lineTo(ix + s, iy + s * 0.7);
    ctx.lineTo(ix + s * 0.7, iy + s);
    ctx.lineTo(ix, iy + s);
    ctx.closePath();
    ctx.fill();

    // Fold triangle
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(ix + s * 0.7, iy + s);
    ctx.lineTo(ix + s, iy + s * 0.7);
    ctx.lineTo(ix + s * 0.7, iy + s * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
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
    // Use quadtree for O(log n) hit testing
    if (this.quadtree) {
      const node = this.quadtree.queryPoint(worldX, worldY);
      return node ? node.id : null;
    }
    // Fallback to tree traversal
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
