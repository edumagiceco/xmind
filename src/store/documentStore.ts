import { create } from 'zustand';
import { temporal } from 'zundo';
import { produce } from 'immer';
import type { Workbook, Sheet, Topic, TopicStyle, StructureType, MapSettings } from '../model/types';
import { createWorkbook, createSheet, createTopic } from '../model/types';
import { generateId } from '../utils/id';

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

// Helper: get active sheet from draft workbook
function getSheet(draft: Workbook, activeSheetId: string): Sheet {
  return draft.sheets.find((s) => s.id === activeSheetId)!;
}

// Helper: mark workbook as modified
function touch(draft: Workbook) {
  draft.metadata.modifiedAt = new Date().toISOString();
}

export interface DocumentState {
  workbook: Workbook;
  activeSheetId: string;
  isDirty: boolean;
  currentFilePath: string | null;

  getActiveSheet: () => Sheet;
  getRootTopic: () => Topic;

  setWorkbook: (workbook: Workbook) => void;
  newWorkbook: () => void;
  markSaved: () => void;
  setCurrentFilePath: (path: string | null) => void;

  setActiveSheet: (sheetId: string) => void;
  addSheet: () => string;
  removeSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, title: string) => void;

  updateTopicTitle: (topicId: string, title: string) => void;
  addChildTopic: (parentId: string) => string;
  addSiblingTopic: (topicId: string) => string | null;
  deleteTopic: (topicId: string) => void;
  toggleCollapse: (topicId: string) => void;
  moveTopic: (topicId: string, newParentId: string, index?: number) => void;

  moveTopicUp: (topicId: string) => void;
  moveTopicDown: (topicId: string) => void;
  promoteTopic: (topicId: string) => void;
  demoteTopic: (topicId: string) => void;

  updateTopicNotes: (topicId: string, text: string) => void;
  toggleMarker: (topicId: string, groupId: string, markerId: string) => void;
  updateTopicHyperlink: (topicId: string, url: string | undefined) => void;

  addRelationship: (startTopicId: string, endTopicId: string) => void;
  removeRelationship: (relationshipId: string) => void;

  updateTopicStyle: (topicId: string, style: Partial<TopicStyle>) => void;
  setSheetStructure: (structure: StructureType) => void;
  setSheetTheme: (themeId: string) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
}

function createInitialWorkbook(): Workbook {
  const rootId = generateId();
  const rootTopic = createTopic(rootId, 'Central Topic');
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

      getRootTopic: () => get().getActiveSheet().rootTopic,

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
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const rootTopic = createTopic(generateId(), 'Central Topic');
            draft.sheets.push(createSheet(newSheetId, `Sheet ${draft.sheets.length + 1}`, rootTopic));
            touch(draft);
          }),
          activeSheetId: newSheetId,
          isDirty: true,
        }));
        return newSheetId;
      },

      removeSheet: (sheetId: string) =>
        set((state) => {
          if (state.workbook.sheets.length <= 1) return state;
          return {
            workbook: produce(state.workbook, (draft) => {
              draft.sheets = draft.sheets.filter((s) => s.id !== sheetId);
              touch(draft);
            }),
            activeSheetId: state.activeSheetId === sheetId ? state.workbook.sheets.find(s => s.id !== sheetId)!.id : state.activeSheetId,
            isDirty: true,
          };
        }),

      renameSheet: (sheetId: string, title: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = draft.sheets.find((s) => s.id === sheetId);
            if (sheet) sheet.title = title;
            touch(draft);
          }),
          isDirty: true,
        })),

      updateTopicTitle: (topicId: string, title: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result) result[0].title = title;
            touch(draft);
          }),
          isDirty: true,
        })),

      addChildTopic: (parentId: string) => {
        const newId = generateId();
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, parentId);
            if (result) {
              result[0].children.attached.push(createTopic(newId, 'New Topic'));
              result[0].collapsed = false;
            }
            touch(draft);
          }),
          isDirty: true,
        }));
        return newId;
      },

      addSiblingTopic: (topicId: string) => {
        const state = get();
        const sheet = state.getActiveSheet();
        if (sheet.rootTopic.id === topicId) return null;

        const newId = generateId();
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result && result[1]) {
              const parent = result[1];
              const idx = parent.children.attached.findIndex((c) => c.id === topicId);
              if (idx !== -1) {
                parent.children.attached.splice(idx + 1, 0, createTopic(newId, 'New Topic'));
              } else {
                parent.children.attached.push(createTopic(newId, 'New Topic'));
              }
            }
            touch(draft);
          }),
          isDirty: true,
        }));
        return newId;
      },

      deleteTopic: (topicId: string) =>
        set((state) => {
          const sheet = getSheet(state.workbook, state.activeSheetId);
          if (sheet.rootTopic.id === topicId) return state;
          return {
            workbook: produce(state.workbook, (draft) => {
              const draftSheet = getSheet(draft, state.activeSheetId);
              const result = findTopic(draftSheet.rootTopic, topicId);
              if (result && result[1]) removeTopic(result[1], topicId);
              touch(draft);
            }),
            isDirty: true,
          };
        }),

      toggleCollapse: (topicId: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result) result[0].collapsed = !result[0].collapsed;
          }),
          isDirty: true,
        })),

      moveTopic: (topicId: string, newParentId: string, index?: number) =>
        set((state) => {
          if (topicId === newParentId) return state;
          // Prevent circular: check on original (non-draft) data
          const sheet = getSheet(state.workbook, state.activeSheetId);
          const topicResult = findTopic(sheet.rootTopic, topicId);
          if (!topicResult) return state;
          if (findTopic(topicResult[0], newParentId)) return state;

          return {
            workbook: produce(state.workbook, (draft) => {
              const draftSheet = getSheet(draft, state.activeSheetId);
              const result = findTopic(draftSheet.rootTopic, topicId);
              if (!result || !result[1]) return;
              const topic = removeTopic(result[1], topicId);
              if (!topic) return;
              const newParentResult = findTopic(draftSheet.rootTopic, newParentId);
              if (!newParentResult) return;
              if (index !== undefined) {
                newParentResult[0].children.attached.splice(index, 0, topic);
              } else {
                newParentResult[0].children.attached.push(topic);
              }
              touch(draft);
            }),
            isDirty: true,
          };
        }),

      moveTopicUp: (topicId: string) =>
        set((state) => {
          const sheet = getSheet(state.workbook, state.activeSheetId);
          if (sheet.rootTopic.id === topicId) return state;
          return {
            workbook: produce(state.workbook, (draft) => {
              const draftSheet = getSheet(draft, state.activeSheetId);
              const result = findTopic(draftSheet.rootTopic, topicId);
              if (!result || !result[1]) return;
              const arr = result[1].children.attached;
              const idx = arr.findIndex((c) => c.id === topicId);
              if (idx <= 0) return;
              [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
              touch(draft);
            }),
            isDirty: true,
          };
        }),

      moveTopicDown: (topicId: string) =>
        set((state) => {
          const sheet = getSheet(state.workbook, state.activeSheetId);
          if (sheet.rootTopic.id === topicId) return state;
          return {
            workbook: produce(state.workbook, (draft) => {
              const draftSheet = getSheet(draft, state.activeSheetId);
              const result = findTopic(draftSheet.rootTopic, topicId);
              if (!result || !result[1]) return;
              const arr = result[1].children.attached;
              const idx = arr.findIndex((c) => c.id === topicId);
              if (idx < 0 || idx >= arr.length - 1) return;
              [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
              touch(draft);
            }),
            isDirty: true,
          };
        }),

      promoteTopic: (topicId: string) =>
        set((state) => {
          const sheet = getSheet(state.workbook, state.activeSheetId);
          if (sheet.rootTopic.id === topicId) return state;
          return {
            workbook: produce(state.workbook, (draft) => {
              const draftSheet = getSheet(draft, state.activeSheetId);
              const result = findTopic(draftSheet.rootTopic, topicId);
              if (!result || !result[1]) return;
              const parent = result[1];
              const parentResult = findTopic(draftSheet.rootTopic, parent.id);
              if (!parentResult || !parentResult[1]) return;
              const grandparent = parentResult[1];
              const topic = removeTopic(parent, topicId);
              if (!topic) return;
              const parentIdx = grandparent.children.attached.findIndex((c) => c.id === parent.id);
              if (parentIdx !== -1) {
                grandparent.children.attached.splice(parentIdx + 1, 0, topic);
              } else {
                grandparent.children.attached.push(topic);
              }
              touch(draft);
            }),
            isDirty: true,
          };
        }),

      demoteTopic: (topicId: string) =>
        set((state) => {
          const sheet = getSheet(state.workbook, state.activeSheetId);
          if (sheet.rootTopic.id === topicId) return state;
          return {
            workbook: produce(state.workbook, (draft) => {
              const draftSheet = getSheet(draft, state.activeSheetId);
              const result = findTopic(draftSheet.rootTopic, topicId);
              if (!result || !result[1]) return;
              const parent = result[1];
              const idx = parent.children.attached.findIndex((c) => c.id === topicId);
              if (idx <= 0) return;
              const newParent = parent.children.attached[idx - 1];
              const topic = removeTopic(parent, topicId);
              if (!topic) return;
              newParent.children.attached.push(topic);
              newParent.collapsed = false;
              touch(draft);
            }),
            isDirty: true,
          };
        }),

      updateTopicNotes: (topicId: string, text: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result) {
              result[0].notes = text.trim() ? [{ type: 'paragraph', children: [{ text }] }] : undefined;
            }
            touch(draft);
          }),
          isDirty: true,
        })),

      toggleMarker: (topicId: string, groupId: string, markerId: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result) {
              const topic = result[0];
              const existingIdx = topic.markers.findIndex(
                (m) => m.groupId === groupId && m.markerId === markerId,
              );
              if (existingIdx !== -1) {
                topic.markers.splice(existingIdx, 1);
              } else {
                topic.markers = topic.markers.filter((m) => m.groupId !== groupId);
                topic.markers.push({ groupId, markerId });
              }
            }
            touch(draft);
          }),
          isDirty: true,
        })),

      updateTopicHyperlink: (topicId: string, url: string | undefined) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result) result[0].hyperlink = url?.trim() || undefined;
            touch(draft);
          }),
          isDirty: true,
        })),

      addRelationship: (startTopicId: string, endTopicId: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            sheet.relationships.push({
              id: generateId(),
              startTopicId,
              endTopicId,
              style: { lineColor: '#ff6b6b', lineWidth: 2, lineStyle: 'curved', arrowEnd: true },
            });
            touch(draft);
          }),
          isDirty: true,
        })),

      removeRelationship: (relationshipId: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            sheet.relationships = sheet.relationships.filter((r) => r.id !== relationshipId);
            touch(draft);
          }),
          isDirty: true,
        })),

      updateTopicStyle: (topicId: string, style: Partial<TopicStyle>) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            const result = findTopic(sheet.rootTopic, topicId);
            if (result) {
              const merged = { ...result[0].style, ...style };
              result[0].style = Object.keys(merged).length > 0 ? merged : undefined;
            }
            touch(draft);
          }),
          isDirty: true,
        })),

      setSheetStructure: (structure: StructureType) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            getSheet(draft, state.activeSheetId).structure = structure;
            touch(draft);
          }),
          isDirty: true,
        })),

      setSheetTheme: (themeId: string) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            getSheet(draft, state.activeSheetId).theme = themeId;
            touch(draft);
          }),
          isDirty: true,
        })),

      updateMapSettings: (settings: Partial<MapSettings>) =>
        set((state) => ({
          workbook: produce(state.workbook, (draft) => {
            const sheet = getSheet(draft, state.activeSheetId);
            sheet.mapSettings = { ...sheet.mapSettings, ...settings };
            touch(draft);
          }),
          isDirty: true,
        })),
    }),
    { limit: 100 },
  ),
);
