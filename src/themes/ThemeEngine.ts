import type { LayoutNode, TopicStyle, Theme } from '../model/types';
import { defaultTheme, themePresets } from './defaultThemes';

const themes = new Map<string, Theme>();
for (const theme of themePresets) {
  themes.set(theme.id, theme);
}

export interface MapSettings {
  coloredBranches?: boolean;
  globalLineWidth?: number;
}

export function getTheme(id: string): Theme {
  return themes.get(id) ?? defaultTheme;
}

export function registerTheme(theme: Theme): void {
  themes.set(theme.id, theme);
}

export function getAllThemes(): Theme[] {
  return Array.from(themes.values());
}

export function getTopicStyle(
  node: LayoutNode,
  theme: Theme,
  mapSettings?: MapSettings,
): TopicStyle {
  const baseStyle = getBaseStyleByDepth(node.depth, theme);
  const useColoredBranches = mapSettings?.coloredBranches !== false;
  const branchColor = useColoredBranches
    ? getBranchColor(node, theme)
    : theme.connectionStyle.lineColor;

  const style: TopicStyle = {
    ...baseStyle,
    lineColor: branchColor,
    ...node.topic.style,
  };

  if (mapSettings?.globalLineWidth != null) {
    style.lineWidth = mapSettings.globalLineWidth;
  }

  return style;
}

function getBaseStyleByDepth(depth: number, theme: Theme): TopicStyle {
  if (depth === 0) return theme.centralTopic;
  if (depth === 1) return theme.mainTopic;
  return theme.subTopic;
}

function getBranchColor(node: LayoutNode, theme: Theme): string {
  let current: LayoutNode | null = node;
  while (current && current.depth > 1) {
    current = current.parent;
  }
  if (!current || current.depth === 0) return theme.connectionStyle.lineColor;

  const parent = current.parent;
  if (!parent) return theme.connectionStyle.lineColor;
  const idx = parent.children.indexOf(current);
  return theme.colorPalette[idx % theme.colorPalette.length];
}
