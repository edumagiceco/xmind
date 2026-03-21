import type { Topic, LayoutNode } from '../../model/types';
import type { LayoutResult, MeasureContext } from '../types';
import { getImageLayoutHeight, getImageMinWidth } from '../imageSize';

const HORIZONTAL_GAP = 20;
const VERTICAL_GAP = 50;
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;
const MIN_NODE_WIDTH = 60;
const MIN_NODE_HEIGHT = 30;

/**
 * Org Chart layout: top-down hierarchical.
 * Root at top center, children arranged below parent, horizontally centered.
 */
export function orgChartLayout(
  rootTopic: Topic,
  measure: MeasureContext,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();

  // Step 1: Build layout tree with measured sizes
  const root = buildLayoutTree(rootTopic, 0, null, measure, nodes);

  // Step 2: Mark all nodes as downward-flowing
  markDirection(root);

  // Step 3: Position root at top center
  root.x = -root.width / 2;
  root.y = -root.height / 2;

  // Step 4: Recursively position children below their parent
  positionChildren(root);

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

function markDirection(node: LayoutNode): void {
  node.branchDirection = 'down';
  for (const child of node.children) {
    markDirection(child);
  }
}

/**
 * Calculate the total width of a subtree.
 * If leaf: return node width.
 * Otherwise: max of node width vs sum of children subtree widths + gaps.
 */
function getSubtreeWidth(node: LayoutNode): number {
  if (node.children.length === 0) return node.width;

  let childrenTotalWidth = 0;
  for (const child of node.children) {
    childrenTotalWidth += getSubtreeWidth(child);
  }
  childrenTotalWidth += (node.children.length - 1) * HORIZONTAL_GAP;

  return Math.max(node.width, childrenTotalWidth);
}

/**
 * Position children horizontally centered below their parent.
 */
function positionChildren(parent: LayoutNode): void {
  if (parent.children.length === 0) return;

  const parentCenterX = parent.x + parent.width / 2;
  const childY = parent.y + parent.height + VERTICAL_GAP;

  // Calculate total width of all children subtrees
  const subtreeWidths: number[] = [];
  let totalChildrenWidth = 0;
  for (const child of parent.children) {
    const sw = getSubtreeWidth(child);
    subtreeWidths.push(sw);
    totalChildrenWidth += sw;
  }
  totalChildrenWidth += (parent.children.length - 1) * HORIZONTAL_GAP;

  // Start positioning from left edge, centered under parent
  let currentX = parentCenterX - totalChildrenWidth / 2;

  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const sw = subtreeWidths[i];

    // Center this node within its subtree width
    child.x = currentX + sw / 2 - child.width / 2;
    child.y = childY;
    child.branchDirection = 'down';

    // Recursively position this child's children
    positionChildren(child);

    currentX += sw + HORIZONTAL_GAP;
  }
}
