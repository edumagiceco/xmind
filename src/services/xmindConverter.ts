import type { Workbook, Sheet, Topic } from '../model/types';
import { createWorkbook, createSheet, createTopic } from '../model/types';
import { generateId } from '../utils/id';

// ===== XMind Zen format types =====

interface XMindSheet {
  id: string;
  class?: string;
  title: string;
  rootTopic: XMindTopic;
  theme?: unknown;
  topicPositioning?: string;
  structureClass?: string;
  relationships?: unknown[];
  [key: string]: unknown; // preserve all unknown fields
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
  [key: string]: unknown; // preserve all unknown fields
}

// ===== Export: Workbook → XMind content.json =====

export function workbookToXMindContent(workbook: Workbook): XMindSheet[] {
  return workbook.sheets.map(sheetToXMind);
}

function sheetToXMind(sheet: Sheet): XMindSheet {
  // Start from preserved raw data if available, otherwise build from scratch
  const raw = sheet._xmindRaw || {};

  const xsheet: XMindSheet = {
    ...raw, // preserve all original fields (extensions, zones, topicPositioning, etc.)
    id: sheet.id,
    class: 'sheet',
    title: sheet.title,
    rootTopic: topicToXMind(sheet.rootTopic, sheet.structure),
  };

  // Theme: preserve original complex theme object if stored in raw
  if (raw.theme) {
    xsheet.theme = raw.theme;
  } else if (sheet.theme && sheet.theme !== 'default') {
    // Only set simple string theme if no complex theme exists
    xsheet.theme = sheet.theme;
  }

  // Relationships: preserve if present
  if (sheet.relationships.length > 0) {
    xsheet.relationships = sheet.relationships;
  } else if (raw.relationships) {
    xsheet.relationships = raw.relationships as unknown[];
  }

  // Remove sheet-level structureClass — XMind stores it on rootTopic
  delete xsheet.structureClass;

  return xsheet;
}

function topicToXMind(topic: Topic, structure?: string): XMindTopic {
  // Start from preserved raw data if available
  const raw = topic._xmindRaw || {};

  const xtopic: XMindTopic = {
    ...raw, // preserve all original fields
    id: topic.id,
    title: topic.title,
  };

  // Only set class if it was in the original, or if this is a new topic
  if (raw.class) {
    xtopic.class = raw.class as string;
  } else if (!topic._xmindRaw) {
    xtopic.class = 'topic';
  }

  // Structure class: set on root topic (depth detection by checking if topic has _xmindRaw with structureClass)
  if (structure && structure !== 'mind-map') {
    // This will be set by the caller for the root topic
    xtopic.structureClass = structureToXMindClass(structure);
  } else if (raw.structureClass) {
    // Preserve original structureClass if structure is mind-map (default)
    // Only delete if explicitly changed
    if (structure === 'mind-map') {
      delete xtopic.structureClass;
    }
  }

  // Children
  if (topic.children.attached.length > 0 || topic.children.detached.length > 0) {
    xtopic.children = {};
    if (topic.children.attached.length > 0) {
      // Don't pass structure to children — only root topic gets structureClass
      xtopic.children.attached = topic.children.attached.map((c) => topicToXMind(c));
    }
    if (topic.children.detached.length > 0) {
      xtopic.children.detached = topic.children.detached.map((c) => topicToXMind(c));
    }
  } else if (!raw.children) {
    delete xtopic.children;
  }

  // Markers
  if (topic.markers.length > 0) {
    xtopic.markers = topic.markers;
  } else if (!raw.markers) {
    delete xtopic.markers;
  }

  // Labels
  if (topic.labels.length > 0) {
    xtopic.labels = topic.labels;
  } else if (!raw.labels) {
    delete xtopic.labels;
  }

  // Hyperlink
  if (topic.hyperlink) {
    xtopic.href = topic.hyperlink;
  } else if (!raw.href) {
    delete xtopic.href;
  }

  // Collapsed
  if (topic.collapsed) {
    xtopic.collapsed = true;
  } else {
    delete xtopic.collapsed;
  }

  // Image
  if (topic.image) {
    xtopic.image = topic.image;
  } else {
    delete xtopic.image;
  }

  // Style
  if (topic.style) {
    xtopic.style = {
      ...(raw.style as Record<string, unknown> || {}),
      properties: {
        ...((raw.style as Record<string, unknown>)?.properties as Record<string, string> || {}),
        ...topicStyleToProperties(topic.style),
      },
    };
  } else if (!raw.style) {
    delete xtopic.style;
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

  // Check structureClass on sheet level first, then rootTopic level (XMind stores it on rootTopic)
  const structureClass = s.structureClass || s.rootTopic?.structureClass;
  if (structureClass) {
    sheet.structure = xmindClassToStructure(structureClass);
  }

  // Theme: store as internal ID only if it's a simple string
  if (s.theme && typeof s.theme === 'string') {
    sheet.theme = s.theme;
  }
  // Complex theme objects are preserved in _xmindRaw

  // Preserve the entire original sheet data for round-trip
  const { rootTopic: _rt, ...rawCopy } = s;
  sheet._xmindRaw = rawCopy;

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

  // Preserve original topic data for round-trip (without children to avoid duplication)
  const rawCopy = { ...data };
  delete rawCopy.children; // Don't duplicate children in raw
  topic._xmindRaw = rawCopy;

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
    if (value === cls) {
      return key as Sheet['structure'];
    }
  }
  // Fallback matching by partial class name
  if (cls.includes('logic')) return 'logic-chart';
  if (cls.includes('org-chart')) return 'org-chart';
  if (cls.includes('brace')) return 'brace-map';
  if (cls.includes('tree') && cls.includes('table')) return 'tree-table';
  if (cls.includes('tree')) return 'tree-chart';
  if (cls.includes('timeline')) return 'timeline';
  if (cls.includes('fishbone')) return 'fishbone';
  if (cls.includes('matrix')) return 'matrix';
  if (cls.includes('map')) return 'mind-map';
  return 'mind-map';
}

// ===== Style property mapping =====

function topicStyleToProperties(style: NonNullable<Topic['style']>): Record<string, string> {
  const props: Record<string, string> = {};
  if (style.fillColor) props['svg:fill'] = style.fillColor;
  if (style.borderColor) props['border-line-color'] = style.borderColor;
  if (style.borderWidth) props['border-line-width'] = `${style.borderWidth}pt`;
  if (style.borderStyle) props['border-line-style'] = style.borderStyle;
  if (style.fontFamily) props['fo:font-family'] = style.fontFamily;
  if (style.fontSize) props['fo:font-size'] = `${style.fontSize}pt`;
  if (style.fontColor) props['fo:color'] = style.fontColor;
  if (style.fontWeight) props['fo:font-weight'] = style.fontWeight === 'bold' ? 'bold' : 'normal';
  if (style.fontStyle) props['fo:font-style'] = style.fontStyle;
  if (style.textDecoration) props['fo:text-decoration'] = style.textDecoration;
  if (style.textAlign) props['fo:text-align'] = style.textAlign;
  if (style.lineColor) props['line-color'] = style.lineColor;
  if (style.lineWidth) props['line-width'] = `${style.lineWidth}pt`;
  if (style.lineStyle) props['line-style'] = style.lineStyle;
  if (style.shape) props['shape-class'] = `org.xmind.topicShape.${style.shape}`;
  return props;
}

function propertiesToTopicStyle(props: Record<string, string>): Topic['style'] {
  const style: NonNullable<Topic['style']> = {};
  if (props['svg:fill']) style.fillColor = props['svg:fill'];
  if (props['border-line-color']) style.borderColor = props['border-line-color'];
  if (props['border-line-width']) style.borderWidth = parseFloat(props['border-line-width']);
  if (props['border-line-style']) style.borderStyle = props['border-line-style'] as NonNullable<Topic['style']>['borderStyle'];
  if (props['fo:font-family']) style.fontFamily = props['fo:font-family'];
  if (props['fo:font-size']) style.fontSize = parseFloat(props['fo:font-size']);
  if (props['fo:color']) style.fontColor = props['fo:color'];
  if (props['fo:font-weight']) style.fontWeight = props['fo:font-weight'] === 'bold' ? 'bold' : 'normal';
  if (props['fo:font-style']) style.fontStyle = props['fo:font-style'] as NonNullable<Topic['style']>['fontStyle'];
  if (props['fo:text-decoration']) style.textDecoration = props['fo:text-decoration'] as NonNullable<Topic['style']>['textDecoration'];
  if (props['fo:text-align']) style.textAlign = props['fo:text-align'] as NonNullable<Topic['style']>['textAlign'];
  if (props['line-color']) style.lineColor = props['line-color'];
  if (props['line-width']) style.lineWidth = parseFloat(props['line-width']);
  if (props['line-style']) style.lineStyle = props['line-style'] as NonNullable<Topic['style']>['lineStyle'];
  if (props['shape-class']) {
    const shapeStr = props['shape-class'].replace('org.xmind.topicShape.', '');
    style.shape = shapeStr as NonNullable<Topic['style']>['shape'];
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

// ===== Metadata =====

export function createXMindMetadata() {
  return {
    creator: { name: 'MAX Mind', version: '1.0.0' },
    dataStructureVersion: '3',
    layoutEngineVersion: '5',
    activeSheetId: '',
  };
}
