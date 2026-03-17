import type { Topic, LayoutNode } from '../../model/types';
import type { LayoutResult, MeasureContext } from '../types';

const INDENT = 30;
const VERTICAL_GAP = 8;
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;
const MIN_NODE_WIDTH = 60;
const MIN_NODE_HEIGHT = 30;

/**
 * Tree Chart layout: indented tree flowing right, like a file explorer.
 * Root on the left, children stacked vertically below parent, indented to the right.
 */
export function treeChartLayout(
  rootTopic: Topic,
  measure: MeasureContext,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();

  // Step 1: Build layout tree with measured sizes
  const root = buildLayoutTree(rootTopic, 0, null, measure, nodes);

  // Step 2: Mark all nodes as right-flowing
  markDirection(root);

  // Step 3: Position root at top-left
  root.x = -root.width / 2;
  root.y = 0;

  // Step 4: Recursively position all nodes using a Y cursor
  const cursor = { y: root.y + root.height + VERTICAL_GAP };
  positionChildren(root, 0, cursor);

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

/**
 * Position children in an indented list style.
 * Each child is placed at depth * INDENT horizontally, and stacked vertically.
 */
function positionChildren(
  parent: LayoutNode,
  baseX: number,
  cursor: { y: number },
): void {
  for (const child of parent.children) {
    const childDepth = child.depth;
    child.x = baseX + childDepth * INDENT - child.width / 2;
    child.y = cursor.y;
    child.branchDirection = 'right';

    cursor.y += child.height + VERTICAL_GAP;

    // Recursively position grandchildren
    positionChildren(child, baseX, cursor);
  }
}
