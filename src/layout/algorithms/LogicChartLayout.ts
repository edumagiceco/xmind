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
 * Similar to mind-map's right side but with no left-right split.
 */
export function logicChartLayout(
  rootTopic: Topic,
  measure: MeasureContext,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();

  // Step 1: Build layout tree with measured sizes
  const root = buildLayoutTree(rootTopic, 0, null, measure, nodes);

  // Step 2: Mark all children as right-flowing
  markDirection(root);

  // Step 3: Layout children as a vertical tree on the right
  const totalHeight = layoutVerticalTree(root.children);

  // Step 4: Position root at left
  root.x = -root.width / 2;
  root.y = -root.height / 2;

  // Step 5: Position all children to the right
  if (root.children.length > 0) {
    const startX = root.x + root.width + HORIZONTAL_GAP;
    const startY = -totalHeight / 2;
    positionChildren(root.children, startX, startY);
  }

  return { root, nodes };
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

function layoutVerticalTree(children: LayoutNode[]): number {
  if (children.length === 0) return 0;

  let totalHeight = 0;
  for (const child of children) {
    const subtreeHeight = getSubtreeHeight(child);
    (child as LayoutNode & { _subtreeHeight: number })._subtreeHeight = subtreeHeight;
    totalHeight += subtreeHeight;
  }
  totalHeight += (children.length - 1) * VERTICAL_GAP;

  return totalHeight;
}

function getSubtreeHeight(node: LayoutNode): number {
  if (node.children.length === 0) return node.height;

  let childrenTotalHeight = 0;
  for (const child of node.children) {
    childrenTotalHeight += getSubtreeHeight(child);
  }
  childrenTotalHeight += (node.children.length - 1) * VERTICAL_GAP;

  return Math.max(node.height, childrenTotalHeight);
}

function getSubtreeChildrenHeight(node: LayoutNode): number {
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
    const subtreeHeight =
      (child as LayoutNode & { _subtreeHeight: number })._subtreeHeight || child.height;

    child.x = startX;
    child.y = currentY + subtreeHeight / 2 - child.height / 2;
    child.branchDirection = 'right';

    if (child.children.length > 0) {
      const childStartX = child.x + child.width + HORIZONTAL_GAP;
      const childrenTotalHeight = getSubtreeChildrenHeight(child);
      const childStartY = currentY + subtreeHeight / 2 - childrenTotalHeight / 2;

      positionChildren(child.children, childStartX, childStartY);
    }

    currentY += subtreeHeight + VERTICAL_GAP;
  }
}
