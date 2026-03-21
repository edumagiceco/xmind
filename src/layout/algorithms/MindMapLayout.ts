import type { Topic, LayoutNode } from '../../model/types';
import type { LayoutResult, MeasureContext } from '../types';
import { getImageLayoutHeight, getImageMinWidth } from '../imageSize';

const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 16;
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;
const MIN_NODE_WIDTH = 60;
const MIN_NODE_HEIGHT = 30;

/**
 * Classic Mind Map layout: root centered, children split left/right.
 * Uses a simplified tidy tree approach for each side.
 */
export function mindMapLayout(
  rootTopic: Topic,
  measure: MeasureContext,
): LayoutResult {
  heightCache.clear(); // Reset memoization for this pass
  const nodes = new Map<string, LayoutNode>();

  // Step 1: Build layout tree with measured sizes
  const root = buildLayoutTree(rootTopic, 0, null, measure, nodes);

  // Step 2: Split children into left and right sides
  const leftChildren: LayoutNode[] = [];
  const rightChildren: LayoutNode[] = [];

  root.children.forEach((child, i) => {
    if (child.topic.branchDirection === 'left') {
      leftChildren.push(child);
    } else if (child.topic.branchDirection === 'right') {
      rightChildren.push(child);
    } else {
      // Auto: balance evenly
      if (i % 2 === 0) {
        rightChildren.push(child);
      } else {
        leftChildren.push(child);
      }
    }
  });

  // Mark branch direction
  leftChildren.forEach((c) => (c.branchDirection = 'left'));
  rightChildren.forEach((c) => (c.branchDirection = 'right'));

  // Step 3: Layout each side as a vertical tree
  const rightHeight = layoutVerticalTree(rightChildren);
  const leftHeight = layoutVerticalTree(leftChildren);

  // Step 4: Position root at center
  root.x = -root.width / 2;
  root.y = -root.height / 2;

  // Step 5: Position right children
  const rightStartX = root.x + root.width + HORIZONTAL_GAP;
  const rightStartY = -rightHeight / 2;
  positionSubtree(rightChildren, rightStartX, rightStartY, 'right');

  // Step 6: Position left children (mirrored)
  const leftStartY = -leftHeight / 2;
  positionSubtreeLeft(leftChildren, root.x - HORIZONTAL_GAP, leftStartY);

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

  const imgMinW = getImageMinWidth(topic, NODE_PADDING_X);
  const width = Math.max(textSize.width + NODE_PADDING_X * 2, MIN_NODE_WIDTH, imgMinW);
  const imageHeight = getImageLayoutHeight(topic, width, NODE_PADDING_X);
  const height = Math.max(textSize.height + imageHeight + NODE_PADDING_Y * 2, MIN_NODE_HEIGHT);

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

// Memoized subtree height cache — rebuilt per layout pass
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

function positionSubtree(
  children: LayoutNode[],
  startX: number,
  startY: number,
  direction: 'left' | 'right',
) {
  let currentY = startY;

  for (const child of children) {
    const subtreeHeight = (child as LayoutNode & { _subtreeHeight: number })._subtreeHeight || child.height;

    // Center this node within its subtree height
    child.x = startX;
    child.y = currentY + subtreeHeight / 2 - child.height / 2;
    child.branchDirection = direction;

    // Recursively position children
    if (child.children.length > 0) {
      const childStartX = child.x + child.width + HORIZONTAL_GAP;
      const childrenTotalHeight = getSubtreeChildrenHeight(child);
      const childStartY = currentY + subtreeHeight / 2 - childrenTotalHeight / 2;

      positionChildrenVertical(child.children, childStartX, childStartY, direction);
    }

    currentY += subtreeHeight + VERTICAL_GAP;
  }
}

function positionSubtreeLeft(
  children: LayoutNode[],
  rightEdgeX: number,
  startY: number,
) {
  let currentY = startY;

  for (const child of children) {
    const subtreeHeight = (child as LayoutNode & { _subtreeHeight: number })._subtreeHeight || child.height;

    child.x = rightEdgeX - child.width;
    child.y = currentY + subtreeHeight / 2 - child.height / 2;
    child.branchDirection = 'left';

    if (child.children.length > 0) {
      const childRightEdge = child.x - HORIZONTAL_GAP;
      const childrenTotalHeight = getSubtreeChildrenHeight(child);
      const childStartY = currentY + subtreeHeight / 2 - childrenTotalHeight / 2;

      positionChildrenLeft(child.children, childRightEdge, childStartY);
    }

    currentY += subtreeHeight + VERTICAL_GAP;
  }
}

function positionChildrenVertical(
  children: LayoutNode[],
  startX: number,
  startY: number,
  direction: 'left' | 'right',
) {
  let currentY = startY;

  for (const child of children) {
    const subtreeHeight = getSubtreeHeight(child);

    child.x = startX;
    child.y = currentY + subtreeHeight / 2 - child.height / 2;
    child.branchDirection = direction;

    if (child.children.length > 0) {
      const childStartX = child.x + child.width + HORIZONTAL_GAP;
      const childrenTotalHeight = getSubtreeChildrenHeight(child);
      const childStartY = currentY + subtreeHeight / 2 - childrenTotalHeight / 2;

      positionChildrenVertical(child.children, childStartX, childStartY, direction);
    }

    currentY += subtreeHeight + VERTICAL_GAP;
  }
}

function positionChildrenLeft(
  children: LayoutNode[],
  rightEdgeX: number,
  startY: number,
) {
  let currentY = startY;

  for (const child of children) {
    const subtreeHeight = getSubtreeHeight(child);

    child.x = rightEdgeX - child.width;
    child.y = currentY + subtreeHeight / 2 - child.height / 2;
    child.branchDirection = 'left';

    if (child.children.length > 0) {
      const childRightEdge = child.x - HORIZONTAL_GAP;
      const childrenTotalHeight = getSubtreeChildrenHeight(child);
      const childStartY = currentY + subtreeHeight / 2 - childrenTotalHeight / 2;

      positionChildrenLeft(child.children, childRightEdge, childStartY);
    }

    currentY += subtreeHeight + VERTICAL_GAP;
  }
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
