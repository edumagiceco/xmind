// ===== Core Data Model =====

export type StructureType =
  | 'mind-map'
  | 'logic-chart'
  | 'brace-map'
  | 'org-chart'
  | 'tree-chart'
  | 'timeline'
  | 'fishbone'
  | 'tree-table'
  | 'matrix';

export interface Workbook {
  id: string;
  sheets: Sheet[];
  metadata: WorkbookMetadata;
}

export interface WorkbookMetadata {
  creator: string;
  version: string;
  createdAt: string;
  modifiedAt: string;
}

export interface MapSettings {
  coloredBranches?: boolean;
  backgroundColor?: string;
  globalLineWidth?: number;
}

export interface Sheet {
  id: string;
  title: string;
  rootTopic: Topic;
  relationships: Relationship[];
  boundaries: Boundary[];
  summaries: Summary[];
  theme: string; // theme id reference
  structure: StructureType;
  mapSettings?: MapSettings;
  // Preserve original XMind data for round-trip compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _xmindRaw?: Record<string, any>;
}

export interface Topic {
  id: string;
  title: string;
  richText?: RichTextBlock[];
  children: {
    attached: Topic[];
    detached: Topic[];
  };
  markers: Marker[];
  labels: string[];
  notes?: RichTextBlock[];
  image?: ImageAttachment;
  hyperlink?: string;
  style?: TopicStyle;
  collapsed?: boolean;
  branchDirection?: 'left' | 'right' | 'auto';
  // Preserve original XMind data for round-trip compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _xmindRaw?: Record<string, any>;
}

export interface RichTextBlock {
  type: 'paragraph' | 'heading' | 'list';
  children: RichTextSpan[];
}

export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  href?: string;
}

export type TopicShape =
  | 'rounded-rect'
  | 'rect'
  | 'ellipse'
  | 'diamond'
  | 'underline'
  | 'capsule'
  | 'parallelogram';

export type LineStyle = 'curved' | 'straight' | 'angular' | 'elbow';
export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'none';

export type TextAlign = 'left' | 'center' | 'right';

export interface TopicStyle {
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: BorderStyle;
  shape?: TopicShape;
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textAlign?: TextAlign;
}

export interface Marker {
  groupId: string;
  markerId: string;
}

export interface ImageAttachment {
  src: string;
  width: number;
  height: number;
}

export interface Relationship {
  id: string;
  startTopicId: string;
  endTopicId: string;
  title?: string;
  style?: {
    lineColor?: string;
    lineWidth?: number;
    lineStyle?: LineStyle;
    arrowStart?: boolean;
    arrowEnd?: boolean;
  };
  controlPoints?: Point[];
}

export interface Boundary {
  id: string;
  title?: string;
  topicIds: string[];
  style?: {
    fillColor?: string;
    borderColor?: string;
    borderStyle?: BorderStyle;
  };
}

export interface Summary {
  id: string;
  title?: string;
  topicIds: string[];
  summaryTopic: Topic;
}

// ===== Theme =====

export interface Theme {
  id: string;
  name: string;
  centralTopic: TopicStyle;
  mainTopic: TopicStyle;
  subTopic: TopicStyle;
  floatingTopic: TopicStyle;
  connectionStyle: {
    lineColor: string;
    lineWidth: number;
    lineStyle: LineStyle;
  };
  canvas: {
    backgroundColor: string;
  };
  colorPalette: string[];
  handDrawn?: boolean;
}

// ===== Layout =====

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutNode {
  id: string;
  topic: Topic;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  children: LayoutNode[];
  parent: LayoutNode | null;
  branchDirection?: 'left' | 'right' | 'down';
}

// ===== Helpers =====

export function createTopic(id: string, title: string): Topic {
  return {
    id,
    title,
    children: { attached: [], detached: [] },
    markers: [],
    labels: [],
  };
}

export function createSheet(id: string, title: string, rootTopic: Topic): Sheet {
  return {
    id,
    title,
    rootTopic,
    relationships: [],
    boundaries: [],
    summaries: [],
    theme: 'default',
    structure: 'mind-map',
  };
}

export function createWorkbook(id: string, sheets: Sheet[]): Workbook {
  const now = new Date().toISOString();
  return {
    id,
    sheets,
    metadata: {
      creator: 'MAX Mind',
      version: '1.0.0',
      createdAt: now,
      modifiedAt: now,
    },
  };
}
