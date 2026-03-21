import type { Topic, LayoutNode } from '../../model/types';
import type { LayoutResult, MeasureContext } from '../types';

const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 16;
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;
const MIN_NODE_WIDTH = 60;
const MIN_NODE_HEIGHT = 30;

/**
 * Logic Chart layout: root on left, all children flow to the RIGHT.
 * Bracket-style orthogonal connections with uniform node widths per depth level.
 */
export function logicChartLayout(
  rootTopic: Topic,
  measure: MeasureContext,
): LayoutResult {
  heightCache.clear();
  const nodes = new Map<string, LayoutNode>();

  // Step 1: Build layout tree with measured sizes
  const root = buildLayoutTree(rootTopic, 0, null, measure, nodes);

  // Step 2: Uniform widths per depth level
  const maxWidthByDepth = new Map<number, number>();
  collectMaxWidths(root, maxWidthByDepth);
  applyUniformWidths(root, maxWidthByDepth);

  // Step 3: Mark all children as right-flowing
  markDirection(root);

  // Step 4: Compute total height for root's children
  const totalHeight = computeChildrenTotalHeight(root);

  // Step 5: Position root at left
  root.x = -root.width / 2;
  root.y = -root.height / 2;

  // Step 6: Position all children to the right
  if (root.children.length > 0) {
    const startX = root.x + root.width + HORIZONTAL_GAP;
    const startY = -totalHeight / 2;
    positionChildren(root.children, startX, startY);
  }

  return { root, nodes };
}

function collectMaxWidths(node: LayoutNode, maxWidths: Map<number, number>): void {
  const current = maxWidths.get(node.depth) ?? 0;
  if (node.width > current) {
    maxWidths.set(node.depth, node.width);
  }
  for (const child of node.children) {
    collectMaxWidths(child, maxWidths);
  }
}

function applyUniformWidths(node: LayoutNode, maxWidths: Map<number, number>): void {
  node.width = maxWidths.get(node.depth) ?? node.width;
  for (const child of node.children) {
    applyUniformWidths(child, maxWidths);
  }
}

function buildLayoutTree(
  topic: Topic,
  depth: number,
  parent: LayoutNode | null,
  measure: MeasureContext,
  nodes: Map<string, LayoutNode>,
): LayoutNode {
  const fontSize = depth === 0 ? 18 : depth === 1 ? 14 : 12;
  const fontWeight = depth === 0 ? 'bold' : 'normal';
  const textSize = measure.measureText(topic.title, fontSize, fontWeight);

  const width = Math.max(textSize.width + NODE_PADDING_X * 2, MIN_NODE_WIDTH);
  const height = Math.max(textSize.height + NODE_PADDING_Y * 2, MIN_NODE_HEIGHT);

  const node: LayoutNode = {
    id: topic.id,
    topic,
    x: 0,
    y: 0,
    width,
    height,
    depth,
    children: [],
    parent,
  };

  nodes.set(topic.id, node);

  if (!topic.collapsed) {
    node.children = topic.children.attached.map((child) =>
      buildLayoutTree(child, depth + 1, node, measure, nodes),
    );
  }

  return node;
}

function markDirection(node: LayoutNode): void {
  node.branchDirection = 'right';
  for (const child of node.children) {
    markDirection(child);
  }
}

const heightCache = new Map<string, number>();

function getSubtreeHeight(node: LayoutNode): number {
  const cached = heightCache.get(node.id);
  if (cached !== undefined) return cached;

  let result: number;
  if (node.children.length === 0) {
    result = node.height;
  } else {
    let childrenTotalHeight = 0;
    for (const child of node.children) {
      childrenTotalHeight += getSubtreeHeight(child);
    }
    childrenTotalHeight += (node.children.length - 1) * VERTICAL_GAP;
    result = Math.max(node.height, childrenTotalHeight);
  }

  heightCache.set(node.id, result);
  return result;
}

function computeChildrenTotalHeight(node: LayoutNode): number {
  if (node.children.length === 0) return 0;
  let total = 0;
  for (const child of node.children) {
    total += getSubtreeHeight(child);
  }
  total += (node.children.length - 1) * VERTICAL_GAP;
  return total;
}

function positionChildren(
  children: LayoutNode[],
  startX: number,
  startY: number,
): void {
  let currentY = startY;

  for (const child of children) {
    // Always compute fresh subtree height — never rely on cached values
    const subtreeHeight = getSubtreeHeight(child);

    // Center this node vertically within its subtree space
    child.x = startX;
    child.y = currentY + subtreeHeight / 2 - child.height / 2;
    child.branchDirection = 'right';

    // Recursively position grandchildren
    if (child.children.length > 0) {
      const childStartX = child.x + child.width + HORIZONTAL_GAP;
      const childrenTotalHeight = computeChildrenTotalHeight(child);
      const childStartY = currentY + subtreeHeight / 2 - childrenTotalHeight / 2;

      positionChildren(child.children, childStartX, childStartY);
    }

    currentY += subtreeHeight + VERTICAL_GAP;
  }
}
