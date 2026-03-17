import type { Topic, LayoutNode } from '../../model/types';
import type { LayoutResult, MeasureContext } from '../types';

const INDENT = 30;
const VERTICAL_GAP = 8;
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;
const MIN_NODE_WIDTH = 60;
const MIN_NODE_HEIGHT = 30;

/**
 * Tree Chart layout: indented tree flowing down-right, like a file explorer.
 * Root at top, children stacked vertically below parent, indented to the right.
 */
export function treeChartLayout(
  rootTopic: Topic,
  measure: MeasureContext,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();

  // Step 1: Build layout tree with measured sizes
  const root = buildLayoutTree(rootTopic, 0, null, measure, nodes);

  // Step 2: Position root at top-left
  root.x = 0;
  root.y = 0;
  root.branchDirection = 'right';

  // Step 3: Recursively position all nodes using a Y cursor
  const cursor = { y: root.y + root.height + VERTICAL_GAP };
  positionChildren(root, cursor);

  // Step 4: Center the whole tree around origin
  const bounds = computeBounds(root);
  const offsetX = (bounds.minX + bounds.maxX) / 2;
  const offsetY = (bounds.minY + bounds.maxY) / 2;
  shiftTree(root, -offsetX, -offsetY);

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

/**
 * Position children in an indented list style.
 * Each child is placed at parent.x + INDENT horizontally, stacked vertically.
 * Uses branchDirection='down' since children are below their parent.
 */
function positionChildren(
  parent: LayoutNode,
  cursor: { y: number },
): void {
  for (const child of parent.children) {
    child.x = parent.x + INDENT;
    child.y = cursor.y;
    child.branchDirection = 'down';

    cursor.y += child.height + VERTICAL_GAP;

    // Recursively position grandchildren
    positionChildren(child, cursor);
  }
}

function computeBounds(node: LayoutNode): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = node.x;
  let maxX = node.x + node.width;
  let minY = node.y;
  let maxY = node.y + node.height;

  for (const child of node.children) {
    const cb = computeBounds(child);
    if (cb.minX < minX) minX = cb.minX;
    if (cb.maxX > maxX) maxX = cb.maxX;
    if (cb.minY < minY) minY = cb.minY;
    if (cb.maxY > maxY) maxY = cb.maxY;
  }

  return { minX, maxX, minY, maxY };
}

function shiftTree(node: LayoutNode, dx: number, dy: number): void {
  node.x += dx;
  node.y += dy;
  for (const child of node.children) {
    shiftTree(child, dx, dy);
  }
}
