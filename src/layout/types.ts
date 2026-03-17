import type { LayoutNode, Topic } from '../model/types';

export interface MeasureContext {
  measureText: (text: string, fontSize: number, fontWeight: string) => { width: number; height: number };
}

export interface LayoutResult {
  root: LayoutNode;
  nodes: Map<string, LayoutNode>;
}

export type LayoutAlgorithm = (
  rootTopic: Topic,
  measure: MeasureContext,
) => LayoutResult;
