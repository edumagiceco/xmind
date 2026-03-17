import type { Topic, StructureType } from '../model/types';
import type { LayoutAlgorithm, LayoutResult, MeasureContext } from './types';
import { mindMapLayout } from './algorithms/MindMapLayout';
import { logicChartLayout } from './algorithms/LogicChartLayout';
import { orgChartLayout } from './algorithms/OrgChartLayout';
import { treeChartLayout } from './algorithms/TreeChartLayout';

const algorithms: Partial<Record<StructureType, LayoutAlgorithm>> = {
  'mind-map': mindMapLayout,
  'logic-chart': logicChartLayout,
  'org-chart': orgChartLayout,
  'tree-chart': treeChartLayout,
};

export function computeLayout(
  rootTopic: Topic,
  structure: StructureType,
  measure: MeasureContext,
): LayoutResult {
  const algo = algorithms[structure] ?? mindMapLayout;
  return algo(rootTopic, measure);
}
