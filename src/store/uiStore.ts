import { create } from 'zustand';
import type { Point } from '../model/types';

export interface UIState {
  // Viewport / Camera
  camera: {
    x: number;
    y: number;
    zoom: number;
  };

  // Selection
  selectedTopicIds: string[];
  editingTopicId: string | null;

  // Hover
  hoveredTopicId: string | null;

  // Sidebar
  sidebarTab: 'style' | 'map' | 'notes';
  sidebarOpen: boolean;

  // View mode
  viewMode: 'map' | 'outliner';

  // Zen Mode
  isZenMode: boolean;

  // Interaction mode
  isDragging: boolean;
  isPanning: boolean;

  // Actions
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, center: Point) => void;
  resetView: () => void;

  selectTopic: (topicId: string, append?: boolean) => void;
  clearSelection: () => void;
  startEditing: (topicId: string) => void;
  stopEditing: () => void;
  setHoveredTopic: (topicId: string | null) => void;

  setViewMode: (mode: 'map' | 'outliner') => void;
  toggleViewMode: () => void;

  toggleZenMode: () => void;
  setZenMode: (zen: boolean) => void;

  setDragging: (dragging: boolean) => void;
  setPanning: (panning: boolean) => void;

  setSidebarTab: (tab: 'style' | 'map' | 'notes') => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  camera: { x: 0, y: 0, zoom: 1 },
  selectedTopicIds: [],
  editingTopicId: null,
  hoveredTopicId: null,
  sidebarTab: 'style',
  sidebarOpen: true,
  viewMode: 'map',
  isZenMode: false,
  isDragging: false,
  isPanning: false,

  setCamera: (camera) => set({ camera }),

  pan: (dx, dy) =>
    set((state) => ({
      camera: {
        ...state.camera,
        x: state.camera.x + dx,
        y: state.camera.y + dy,
      },
    })),

  zoom: (factor, center) =>
    set((state) => {
      const newZoom = Math.min(Math.max(state.camera.zoom * factor, 0.1), 5);
      const ratio = newZoom / state.camera.zoom;
      return {
        camera: {
          x: center.x - (center.x - state.camera.x) * ratio,
          y: center.y - (center.y - state.camera.y) * ratio,
          zoom: newZoom,
        },
      };
    }),

  resetView: () => set({ camera: { x: 0, y: 0, zoom: 1 } }),

  selectTopic: (topicId, append = false) =>
    set((state) => ({
      selectedTopicIds: append
        ? state.selectedTopicIds.includes(topicId)
          ? state.selectedTopicIds.filter((id) => id !== topicId)
          : [...state.selectedTopicIds, topicId]
        : [topicId],
    })),

  clearSelection: () => set({ selectedTopicIds: [], editingTopicId: null }),

  startEditing: (topicId) =>
    set({ editingTopicId: topicId, selectedTopicIds: [topicId] }),

  stopEditing: () => set({ editingTopicId: null }),

  setHoveredTopic: (topicId) =>
    set((state) => {
      if (state.hoveredTopicId === topicId) return state;
      return { hoveredTopicId: topicId };
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () => set((state) => ({ viewMode: state.viewMode === 'map' ? 'outliner' : 'map' })),

  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),
  setZenMode: (zen) => set({ isZenMode: zen }),

  setDragging: (dragging) => set({ isDragging: dragging }),
  setPanning: (panning) => set({ isPanning: panning }),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
