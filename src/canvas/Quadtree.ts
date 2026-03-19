import type { LayoutNode, Rect } from '../model/types';

const MAX_NODES = 8;
const MAX_DEPTH = 6;

export class Quadtree {
  private bounds: Rect;
  private nodes: LayoutNode[] = [];
  private children: Quadtree[] | null = null;
  private depth: number;

  constructor(bounds: Rect, depth = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  clear() {
    this.nodes = [];
    this.children = null;
  }

  insert(node: LayoutNode) {
    // If we have subtrees, insert into the appropriate one
    if (this.children) {
      const idx = this.getIndex(node);
      if (idx !== -1) {
        this.children[idx].insert(node);
        return;
      }
    }

    this.nodes.push(node);

    // Split if we exceed capacity and haven't reached max depth
    if (this.nodes.length > MAX_NODES && this.depth < MAX_DEPTH && !this.children) {
      this.subdivide();

      // Re-distribute existing nodes into children
      const remaining: LayoutNode[] = [];
      for (const n of this.nodes) {
        const idx = this.getIndex(n);
        if (idx !== -1) {
          this.children![idx].insert(n);
        } else {
          remaining.push(n);
        }
      }
      this.nodes = remaining;
    }
  }

  /** Query for a node at the given point */
  queryPoint(x: number, y: number): LayoutNode | null {
    // Check nodes at this level (reverse order for front-to-back)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) {
        return n;
      }
    }

    // Check children
    if (this.children) {
      for (let i = 3; i >= 0; i--) {
        const child = this.children[i];
        if (this.containsPoint(child.bounds, x, y)) {
          const result = child.queryPoint(x, y);
          if (result) return result;
        }
      }
    }

    return null;
  }

  /** Query all nodes near a point (within margin) */
  queryNear(x: number, y: number, margin: number): LayoutNode[] {
    const results: LayoutNode[] = [];
    this.queryNearInternal(x, y, margin, results);
    return results;
  }

  private queryNearInternal(x: number, y: number, margin: number, results: LayoutNode[]) {
    for (const n of this.nodes) {
      if (
        x >= n.x - margin && x <= n.x + n.width + margin &&
        y >= n.y - margin && y <= n.y + n.height + margin
      ) {
        results.push(n);
      }
    }

    if (this.children) {
      for (const child of this.children) {
        if (this.boundsOverlap(child.bounds, x - margin, y - margin, margin * 2, margin * 2)) {
          child.queryNearInternal(x, y, margin, results);
        }
      }
    }
  }

  private subdivide() {
    const { x, y, width, height } = this.bounds;
    const hw = width / 2;
    const hh = height / 2;
    const d = this.depth + 1;

    this.children = [
      new Quadtree({ x: x, y: y, width: hw, height: hh }, d),         // top-left
      new Quadtree({ x: x + hw, y: y, width: hw, height: hh }, d),     // top-right
      new Quadtree({ x: x, y: y + hh, width: hw, height: hh }, d),     // bottom-left
      new Quadtree({ x: x + hw, y: y + hh, width: hw, height: hh }, d), // bottom-right
    ];
  }

  /** Determine which quadrant a node belongs to (-1 if it spans multiple) */
  private getIndex(node: LayoutNode): number {
    const { x, y, width, height } = this.bounds;
    const midX = x + width / 2;
    const midY = y + height / 2;

    const fitsTop = node.y >= y && node.y + node.height <= midY;
    const fitsBottom = node.y >= midY && node.y + node.height <= y + height;
    const fitsLeft = node.x >= x && node.x + node.width <= midX;
    const fitsRight = node.x >= midX && node.x + node.width <= x + width;

    if (fitsTop && fitsLeft) return 0;
    if (fitsTop && fitsRight) return 1;
    if (fitsBottom && fitsLeft) return 2;
    if (fitsBottom && fitsRight) return 3;

    return -1; // spans multiple quadrants
  }

  private containsPoint(rect: Rect, x: number, y: number): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  private boundsOverlap(rect: Rect, ox: number, oy: number, ow: number, oh: number): boolean {
    return !(rect.x > ox + ow || rect.x + rect.width < ox || rect.y > oy + oh || rect.y + rect.height < oy);
  }
}

/** Build a quadtree from a layout result */
export function buildQuadtree(nodes: Map<string, LayoutNode>): Quadtree {
  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes.values()) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const margin = 100;
  const qt = new Quadtree({
    x: minX - margin,
    y: minY - margin,
    width: (maxX - minX) + margin * 2,
    height: (maxY - minY) + margin * 2,
  });

  for (const node of nodes.values()) {
    qt.insert(node);
  }

  return qt;
}
