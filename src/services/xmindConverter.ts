import type { Workbook, Sheet, Topic } from '../model/types';
import { createWorkbook, createSheet, createTopic } from '../model/types';
import { generateId } from '../utils/id';

// ===== XMind Zen format types =====

interface XMindSheet {
  id: string;
  class?: string;
  title: string;
  rootTopic: XMindTopic;
  theme?: string;
  topicPositioning?: string;
  structureClass?: string;
  relationships?: unknown[];
}

interface XMindTopic {
  id: string;
  class?: string;
  title: string;
  structureClass?: string;
  children?: {
    attached?: XMindTopic[];
    detached?: XMindTopic[];
  };
  markers?: { markerId: string; groupId?: string }[];
  labels?: string[];
  notes?: unknown;
  image?: { src: string; width: number; height: number };
  href?: string;
  style?: {
    properties?: Record<string, string>;
  };
  branch?: string;
  collapsed?: boolean;
}

// ===== Export: Workbook → XMind content.json =====

export function workbookToXMindContent(workbook: Workbook): XMindSheet[] {
  return workbook.sheets.map(sheetToXMind);
}

function sheetToXMind(sheet: Sheet): XMindSheet {
  const xsheet: XMindSheet = {
    id: sheet.id,
    class: 'sheet',
    title: sheet.title,
    rootTopic: topicToXMind(sheet.rootTopic),
  };

  if (sheet.theme && sheet.theme !== 'default') {
    xsheet.theme = sheet.theme;
  }

  if (sheet.structure !== 'mind-map') {
    xsheet.structureClass = structureToXMindClass(sheet.structure);
  }

  if (sheet.relationships.length > 0) {
    xsheet.relationships = sheet.relationships;
  }

  return xsheet;
}

function topicToXMind(topic: Topic): XMindTopic {
  const xtopic: XMindTopic = {
    id: topic.id,
    class: 'topic',
    title: topic.title,
  };

  if (topic.children.attached.length > 0 || topic.children.detached.length > 0) {
    xtopic.children = {};
    if (topic.children.attached.length > 0) {
      xtopic.children.attached = topic.children.attached.map(topicToXMind);
    }
    if (topic.children.detached.length > 0) {
      xtopic.children.detached = topic.children.detached.map(topicToXMind);
    }
  }

  if (topic.markers.length > 0) {
    xtopic.markers = topic.markers;
  }
  if (topic.labels.length > 0) {
    xtopic.labels = topic.labels;
  }
  if (topic.hyperlink) {
    xtopic.href = topic.hyperlink;
  }
  if (topic.collapsed) {
    xtopic.collapsed = true;
  }
  if (topic.image) {
    xtopic.image = topic.image;
  }
  if (topic.style) {
    xtopic.style = {
      properties: topicStyleToProperties(topic.style),
    };
  }

  return xtopic;
}

// ===== Import: XMind content.json → Workbook =====

export function xmindContentToWorkbook(content: unknown): Workbook {
  // XMind Zen format: content.json is an array of sheets
  if (Array.isArray(content)) {
    const sheets = content.map(xmindToSheet);
    return createWorkbook(generateId(), sheets);
  }

  // Our own format: content.json is a workbook object
  if (content && typeof content === 'object' && 'sheets' in content) {
    const wb = content as { id?: string; sheets: unknown[]; metadata?: unknown };
    const sheets = wb.sheets.map((s) => xmindToSheet(s));
    const workbook = createWorkbook(wb.id || generateId(), sheets);
    if (wb.metadata && typeof wb.metadata === 'object') {
      Object.assign(workbook.metadata, wb.metadata);
    }
    return workbook;
  }

  throw new Error('Unrecognized xmind content.json format');
}

function xmindToSheet(data: unknown): Sheet {
  const s = data as XMindSheet;
  const rootTopic = xmindToTopic(s.rootTopic);
  const sheet = createSheet(s.id || generateId(), s.title || 'Sheet 1', rootTopic);

  if (s.structureClass) {
    sheet.structure = xmindClassToStructure(s.structureClass);
  }
  if (s.theme) {
    sheet.theme = s.theme;
  }

  return sheet;
}

function xmindToTopic(data: XMindTopic): Topic {
  const topic = createTopic(data.id || generateId(), data.title || '');

  if (data.children?.attached) {
    topic.children.attached = data.children.attached.map(xmindToTopic);
  }
  if (data.children?.detached) {
    topic.children.detached = data.children.detached.map(xmindToTopic);
  }
  if (data.markers) {
    topic.markers = data.markers.map((m) => ({
      groupId: m.groupId || '',
      markerId: m.markerId,
    }));
  }
  if (data.labels) {
    topic.labels = data.labels;
  }
  if (data.href) {
    topic.hyperlink = data.href;
  }
  if (data.collapsed) {
    topic.collapsed = true;
  }
  if (data.image) {
    topic.image = data.image;
  }
  if (data.style?.properties) {
    topic.style = propertiesToTopicStyle(data.style.properties);
  }

  return topic;
}

// ===== Structure type mapping =====

const STRUCTURE_CLASS_MAP: Record<string, string> = {
  'mind-map': 'org.xmind.ui.map.unbalanced',
  'logic-chart': 'org.xmind.ui.logic.right',
  'brace-map': 'org.xmind.ui.brace.right',
  'org-chart': 'org.xmind.ui.org-chart.down',
  'tree-chart': 'org.xmind.ui.tree.right',
  'timeline': 'org.xmind.ui.timeline.horizontal',
  'fishbone': 'org.xmind.ui.fishbone.rightHeaded',
  'tree-table': 'org.xmind.ui.tree-table',
  'matrix': 'org.xmind.ui.matrix',
};

function structureToXMindClass(structure: string): string {
  return STRUCTURE_CLASS_MAP[structure] || 'org.xmind.ui.map.unbalanced';
}

function xmindClassToStructure(cls: string): Sheet['structure'] {
  for (const [key, value] of Object.entries(STRUCTURE_CLASS_MAP)) {
    if (cls.includes(key) || value === cls) {
      return key as Sheet['structure'];
    }
  }
  // Fallback matching by partial class name
  if (cls.includes('map')) return 'mind-map';
  if (cls.includes('logic')) return 'logic-chart';
  if (cls.includes('brace')) return 'brace-map';
  if (cls.includes('org-chart')) return 'org-chart';
  if (cls.includes('tree') && cls.includes('table')) return 'tree-table';
  if (cls.includes('tree')) return 'tree-chart';
  if (cls.includes('timeline')) return 'timeline';
  if (cls.includes('fishbone')) return 'fishbone';
  if (cls.includes('matrix')) return 'matrix';
  return 'mind-map';
}

// ===== Style property mapping =====

function topicStyleToProperties(style: NonNullable<Topic['style']>): Record<string, string> {
  const props: Record<string, string> = {};
  if (style.fillColor) props['svg:fill'] = style.fillColor;
  if (style.borderColor) props['border-line-color'] = style.borderColor;
  if (style.borderWidth) props['border-line-width'] = `${style.borderWidth}pt`;
  if (style.fontFamily) props['fo:font-family'] = style.fontFamily;
  if (style.fontSize) props['fo:font-size'] = `${style.fontSize}pt`;
  if (style.fontColor) props['fo:color'] = style.fontColor;
  if (style.fontWeight) props['fo:font-weight'] = style.fontWeight === 'bold' ? 'bold' : 'normal';
  if (style.lineColor) props['line-color'] = style.lineColor;
  if (style.shape) props['shape-class'] = `org.xmind.topicShape.${style.shape}`;
  return props;
}

function propertiesToTopicStyle(props: Record<string, string>): Topic['style'] {
  const style: NonNullable<Topic['style']> = {};
  if (props['svg:fill']) style.fillColor = props['svg:fill'];
  if (props['border-line-color']) style.borderColor = props['border-line-color'];
  if (props['border-line-width']) style.borderWidth = parseFloat(props['border-line-width']);
  if (props['fo:font-family']) style.fontFamily = props['fo:font-family'];
  if (props['fo:font-size']) style.fontSize = parseFloat(props['fo:font-size']);
  if (props['fo:color']) style.fontColor = props['fo:color'];
  if (props['fo:font-weight']) style.fontWeight = props['fo:font-weight'] === 'bold' ? 'bold' : 'normal';
  if (props['line-color']) style.lineColor = props['line-color'];
  if (props['shape-class']) {
    const shapeStr = props['shape-class'].replace('org.xmind.topicShape.', '');
    style.shape = shapeStr as NonNullable<Topic['style']>['shape'];
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

// ===== Metadata =====

export function createXMindMetadata() {
  return {
    creator: { name: 'MindForge', version: '1.0.0' },
    activeSheetId: '',
  };
}
