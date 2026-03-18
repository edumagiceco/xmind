import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Workbook, Sheet, Topic, TopicStyle, StructureType, MapSettings } from '../model/types';
import { createWorkbook, createSheet, createTopic } from '../model/types';
import { generateId } from '../utils/id';

// Deep clone helper for immutable updates
function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Find a topic by id in the tree, returns [topic, parent] or null
function findTopic(
  root: Topic,
  targetId: string,
  parent: Topic | null = null,
): [Topic, Topic | null] | null {
  if (root.id === targetId) return [root, parent];
  for (const child of root.children.attached) {
    const result = findTopic(child, targetId, root);
    if (result) return result;
  }
  for (const child of root.children.detached) {
    const result = findTopic(child, targetId, root);
    if (result) return result;
  }
  return null;
}

// Remove a topic from its parent's children arrays
function removeTopic(parent: Topic, targetId: string): Topic | null {
  const attachedIdx = parent.children.attached.findIndex((c) => c.id === targetId);
  if (attachedIdx !== -1) {
    return parent.children.attached.splice(attachedIdx, 1)[0];
  }
  const detachedIdx = parent.children.detached.findIndex((c) => c.id === targetId);
  if (detachedIdx !== -1) {
    return parent.children.detached.splice(detachedIdx, 1)[0];
  }
  return null;
}

export interface DocumentState {
  workbook: Workbook;
  activeSheetId: string;
  isDirty: boolean;
  currentFilePath: string | null;

  // Getters
  getActiveSheet: () => Sheet;
  getRootTopic: () => Topic;

  // Workbook operations
  setWorkbook: (workbook: Workbook) => void;
  newWorkbook: () => void;
  markSaved: () => void;
  setCurrentFilePath: (path: string | null) => void;

  // Sheet operations
  setActiveSheet: (sheetId: string) => void;
  addSheet: () => string;
  removeSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, title: string) => void;

  // Topic operations
  updateTopicTitle: (topicId: string, title: string) => void;
  addChildTopic: (parentId: string) => string;
  addSiblingTopic: (topicId: string) => string | null;
  deleteTopic: (topicId: string) => void;
  toggleCollapse: (topicId: string) => void;
  moveTopic: (topicId: string, newParentId: string, index?: number) => void;

  // Reorder operations
  moveTopicUp: (topicId: string) => void;
  moveTopicDown: (topicId: string) => void;
  promoteTopic: (topicId: string) => void;
  demoteTopic: (topicId: string) => void;

  // Notes operations
  updateTopicNotes: (topicId: string, text: string) => void;

  // Marker operations
  toggleMarker: (topicId: string, groupId: string, markerId: string) => void;

  // Hyperlink operations
  updateTopicHyperlink: (topicId: string, url: string | undefined) => void;

  // Relationship operations
  addRelationship: (startTopicId: string, endTopicId: string) => void;
  removeRelationship: (relationshipId: string) => void;

  // Style & settings operations
  updateTopicStyle: (topicId: string, style: Partial<TopicStyle>) => void;
  setSheetStructure: (structure: StructureType) => void;
  setSheetTheme: (themeId: string) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
}

function createInitialWorkbook(): Workbook {
  const rootId = generateId();
  const rootTopic = createTopic(rootId, 'Central Topic');

  // Add some default children
  const child1 = createTopic(generateId(), 'Main Topic 1');
  const child2 = createTopic(generateId(), 'Main Topic 2');
  const child3 = createTopic(generateId(), 'Main Topic 3');
  const child4 = createTopic(generateId(), 'Main Topic 4');

  rootTopic.children.attached = [child1, child2, child3, child4];

  const sheetId = generateId();
  const sheet = createSheet(sheetId, 'Sheet 1', rootTopic);
  return createWorkbook(generateId(), [sheet]);
}

const initialWorkbook = createInitialWorkbook();

export const useDocumentStore = create<DocumentState>()(
  temporal(
    (set, get) => ({
      workbook: initialWorkbook,
      activeSheetId: initialWorkbook.sheets[0].id,
      isDirty: false,
      currentFilePath: null,

      getActiveSheet: () => {
        const state = get();
        return state.workbook.sheets.find((s) => s.id === state.activeSheetId)!;
      },

      getRootTopic: () => {
        return get().getActiveSheet().rootTopic;
      },

      setWorkbook: (workbook: Workbook) =>
        set({ workbook, activeSheetId: workbook.sheets[0].id, isDirty: false }),

      newWorkbook: () => {
        const wb = createInitialWorkbook();
        set({ workbook: wb, activeSheetId: wb.sheets[0].id, isDirty: false });
      },

      markSaved: () => set({ isDirty: false }),
      setCurrentFilePath: (path: string | null) => set({ currentFilePath: path }),

      setActiveSheet: (sheetId: string) => set({ activeSheetId: sheetId }),

      addSheet: () => {
        const newSheetId = generateId();
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const rootTopic = createTopic(generateId(), 'Central Topic');
          const sheet = createSheet(newSheetId, `Sheet ${workbook.sheets.length + 1}`, rootTopic);
          workbook.sheets.push(sheet);
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, activeSheetId: newSheetId, isDirty: true };
        });
        return newSheetId;
      },

      removeSheet: (sheetId: string) =>
        set((state) => {
          if (state.workbook.sheets.length <= 1) return state;
          const workbook = cloneDeep(state.workbook);
          workbook.sheets = workbook.sheets.filter((s) => s.id !== sheetId);
          const newActiveId = state.activeSheetId === sheetId
            ? workbook.sheets[0].id
            : state.activeSheetId;
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, activeSheetId: newActiveId, isDirty: true };
        }),

      renameSheet: (sheetId: string, title: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === sheetId);
          if (sheet) sheet.title = title;
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      updateTopicTitle: (topicId: string, title: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result) {
            result[0].title = title;
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      addChildTopic: (parentId: string) => {
        const newId = generateId();
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, parentId);
          if (result) {
            const [parent] = result;
            const newTopic = createTopic(newId, 'New Topic');
            parent.children.attached.push(newTopic);
            parent.collapsed = false;
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        });
        return newId;
      },

      addSiblingTopic: (topicId: string) => {
        const state = get();
        const sheet = state.getActiveSheet();
        // Cannot add sibling to root
        if (sheet.rootTopic.id === topicId) return null;

        const newId = generateId();
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result && result[1]) {
            const [, parent] = result;
            const idx = parent.children.attached.findIndex((c) => c.id === topicId);
            const newTopic = createTopic(newId, 'New Topic');
            if (idx !== -1) {
              parent.children.attached.splice(idx + 1, 0, newTopic);
            } else {
              parent.children.attached.push(newTopic);
            }
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        });
        return newId;
      },

      deleteTopic: (topicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          // Cannot delete root
          if (sheet.rootTopic.id === topicId) return state;

          const result = findTopic(sheet.rootTopic, topicId);
          if (result && result[1]) {
            removeTopic(result[1], topicId);
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      toggleCollapse: (topicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result) {
            result[0].collapsed = !result[0].collapsed;
          }
          return { workbook, isDirty: true };
        }),

      moveTopic: (topicId: string, newParentId: string, index?: number) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;

          // Prevent moving to self
          if (topicId === newParentId) return state;

          // Prevent circular: check if newParent is a descendant of topic
          const topicResult = findTopic(sheet.rootTopic, topicId);
          if (!topicResult) return state;
          if (findTopic(topicResult[0], newParentId)) return state;

          // Find and remove from current parent
          const result = findTopic(sheet.rootTopic, topicId);
          if (!result || !result[1]) return state;
          const topic = removeTopic(result[1], topicId);
          if (!topic) return state;

          // Add to new parent
          const newParentResult = findTopic(sheet.rootTopic, newParentId);
          if (!newParentResult) return state;
          const [newParent] = newParentResult;

          if (index !== undefined) {
            newParent.children.attached.splice(index, 0, topic);
          } else {
            newParent.children.attached.push(topic);
          }

          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),
      // Move topic up among siblings
      moveTopicUp: (topicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          if (sheet.rootTopic.id === topicId) return state;

          const result = findTopic(sheet.rootTopic, topicId);
          if (!result || !result[1]) return state;
          const parent = result[1];
          const idx = parent.children.attached.findIndex((c) => c.id === topicId);
          if (idx <= 0) return state; // already first or not found

          // Swap with previous sibling
          const temp = parent.children.attached[idx];
          parent.children.attached[idx] = parent.children.attached[idx - 1];
          parent.children.attached[idx - 1] = temp;

          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      // Move topic down among siblings
      moveTopicDown: (topicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          if (sheet.rootTopic.id === topicId) return state;

          const result = findTopic(sheet.rootTopic, topicId);
          if (!result || !result[1]) return state;
          const parent = result[1];
          const idx = parent.children.attached.findIndex((c) => c.id === topicId);
          if (idx < 0 || idx >= parent.children.attached.length - 1) return state; // already last

          // Swap with next sibling
          const temp = parent.children.attached[idx];
          parent.children.attached[idx] = parent.children.attached[idx + 1];
          parent.children.attached[idx + 1] = temp;

          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      // Promote: move topic to parent's level (become sibling of parent)
      promoteTopic: (topicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          if (sheet.rootTopic.id === topicId) return state;

          const result = findTopic(sheet.rootTopic, topicId);
          if (!result || !result[1]) return state;
          const parent = result[1];

          // Parent must not be root for promote (we need grandparent)
          const parentResult = findTopic(sheet.rootTopic, parent.id);
          if (!parentResult || !parentResult[1]) return state;
          const grandparent = parentResult[1];

          // Remove from parent
          const topic = removeTopic(parent, topicId);
          if (!topic) return state;

          // Insert after parent in grandparent's children
          const parentIdx = grandparent.children.attached.findIndex((c) => c.id === parent.id);
          if (parentIdx !== -1) {
            grandparent.children.attached.splice(parentIdx + 1, 0, topic);
          } else {
            grandparent.children.attached.push(topic);
          }

          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      // Demote: move topic to become child of previous sibling
      demoteTopic: (topicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          if (sheet.rootTopic.id === topicId) return state;

          const result = findTopic(sheet.rootTopic, topicId);
          if (!result || !result[1]) return state;
          const parent = result[1];
          const idx = parent.children.attached.findIndex((c) => c.id === topicId);
          if (idx <= 0) return state; // no previous sibling to become parent

          // Previous sibling becomes new parent
          const newParent = parent.children.attached[idx - 1];
          const topic = removeTopic(parent, topicId);
          if (!topic) return state;

          newParent.children.attached.push(topic);
          newParent.collapsed = false;

          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      updateTopicNotes: (topicId: string, text: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result) {
            if (text.trim()) {
              result[0].notes = [{ type: 'paragraph', children: [{ text }] }];
            } else {
              result[0].notes = undefined;
            }
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      toggleMarker: (topicId: string, groupId: string, markerId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result) {
            const topic = result[0];
            const existingIdx = topic.markers.findIndex(
              (m) => m.groupId === groupId && m.markerId === markerId,
            );

            if (existingIdx !== -1) {
              // Remove marker if it already exists (toggle off)
              topic.markers.splice(existingIdx, 1);
            } else {
              // Remove any existing marker from same group, then add new one
              topic.markers = topic.markers.filter((m) => m.groupId !== groupId);
              topic.markers.push({ groupId, markerId });
            }
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      updateTopicHyperlink: (topicId: string, url: string | undefined) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result) {
            result[0].hyperlink = url?.trim() || undefined;
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      addRelationship: (startTopicId: string, endTopicId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          sheet.relationships.push({
            id: generateId(),
            startTopicId,
            endTopicId,
            style: { lineColor: '#ff6b6b', lineWidth: 2, lineStyle: 'curved', arrowEnd: true },
          });
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      removeRelationship: (relationshipId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          sheet.relationships = sheet.relationships.filter((r) => r.id !== relationshipId);
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      updateTopicStyle: (topicId: string, style: Partial<TopicStyle>) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          const result = findTopic(sheet.rootTopic, topicId);
          if (result) {
            const merged = { ...result[0].style, ...style };
            result[0].style = Object.keys(merged).length > 0 ? merged : undefined;
          }
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      setSheetStructure: (structure: StructureType) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          sheet.structure = structure;
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      setSheetTheme: (themeId: string) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          sheet.theme = themeId;
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),

      updateMapSettings: (settings: Partial<MapSettings>) =>
        set((state) => {
          const workbook = cloneDeep(state.workbook);
          const sheet = workbook.sheets.find((s) => s.id === state.activeSheetId)!;
          sheet.mapSettings = { ...sheet.mapSettings, ...settings };
          workbook.metadata.modifiedAt = new Date().toISOString();
          return { workbook, isDirty: true };
        }),
    }),
    { limit: 100 },
  ),
);
