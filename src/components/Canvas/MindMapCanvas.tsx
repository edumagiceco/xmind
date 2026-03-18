import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasRenderer } from '../../canvas/CanvasRenderer';
import { computeLayout } from '../../layout/LayoutEngine';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { saveFile, openFile } from '../../services/tauriBridge';
import type { LayoutResult } from '../../layout/types';
import type { Topic } from '../../model/types';

export function MindMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const layoutRef = useRef<LayoutResult | null>(null);

  const [editInput, setEditInput] = useState<{
    topicId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
  } | null>(null);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    renderer.start();

    const handleResize = () => {
      renderer.resize();
      renderer.requestRender();
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas.parentElement!);

    // Non-passive wheel event for zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = useUIStore.getState().camera;

      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        const rect = canvas.getBoundingClientRect();
        useUIStore.getState().zoom(factor, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        useUIStore.getState().pan(-e.deltaX / cam.zoom, -e.deltaY / cam.zoom);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      renderer.stop();
      observer.disconnect();
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Update layout when document changes
  const workbook = useDocumentStore((s) => s.workbook);
  const activeSheetId = useDocumentStore((s) => s.activeSheetId);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const sheet = useDocumentStore.getState().getActiveSheet();
    const layout = computeLayout(sheet.rootTopic, sheet.structure, {
      measureText: (text, fontSize, fontWeight) =>
        renderer.measureText(text, fontSize, fontWeight),
    });

    layoutRef.current = layout;
    renderer.setLayout(layout);
    renderer.setTheme(sheet.theme);
    renderer.setMapSettings(sheet.mapSettings);
    renderer.setStructureType(sheet.structure);
  }, [workbook, activeSheetId]);

  // Sync camera to renderer
  const camera = useUIStore((s) => s.camera);
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.camera.setPosition(camera.x, camera.y);
    renderer.camera.setZoom(camera.zoom);
    renderer.requestRender();
  }, [camera]);

  // Sync selection to renderer
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  useEffect(() => {
    rendererRef.current?.setSelection(selectedTopicIds);
  }, [selectedTopicIds]);

  // Sync editing to renderer
  const editingTopicId = useUIStore((s) => s.editingTopicId);
  useEffect(() => {
    rendererRef.current?.setEditingId(editingTopicId);
  }, [editingTopicId]);

  // Sync hover to renderer
  const hoveredTopicId = useUIStore((s) => s.hoveredTopicId);
  useEffect(() => {
    rendererRef.current?.setHoveredId(hoveredTopicId);
  }, [hoveredTopicId]);

  // Show edit overlay when editing
  useEffect(() => {
    if (!editingTopicId) {
      setEditInput(null);
      return;
    }

    const renderer = rendererRef.current;
    const layout = layoutRef.current;
    if (!renderer || !layout) return;

    const node = layout.nodes.get(editingTopicId);
    if (!node) return;

    const cam = useUIStore.getState().camera;
    const screenPos = renderer.camera.worldToScreen(
      node.x, node.y,
      renderer.canvasWidth, renderer.canvasHeight,
    );

    setEditInput({
      topicId: editingTopicId,
      x: screenPos.x,
      y: screenPos.y,
      width: node.width * cam.zoom,
      height: node.height * cam.zoom,
      value: node.topic.title,
    });
  }, [editingTopicId, camera, workbook]);

  // Helper: convert mouse event to world coordinates
  const getWorldCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return null;
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return renderer.camera.screenToWorld(
      screenX, screenY,
      renderer.canvasWidth, renderer.canvasHeight,
    );
  }, []);

  // Mouse move handler for hover detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const world = getWorldCoords(e);
    if (!world) return;

    const hitId = renderer.hitTest(world.x, world.y);
    useUIStore.getState().setHoveredTopic(hitId);

    // Update cursor
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (hitId) {
      canvas.style.cursor = 'pointer';
    } else {
      const addHit = renderer.hitTestAddButton(world.x, world.y);
      const collapseHit = renderer.hitTestCollapse(world.x, world.y);
      canvas.style.cursor = addHit || collapseHit ? 'pointer' : 'default';
    }
  }, [getWorldCoords]);

  const handleMouseLeave = useCallback(() => {
    useUIStore.getState().setHoveredTopic(null);
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer || e.button !== 0) return;

    const world = getWorldCoords(e);
    if (!world) return;

    // Check "+" add button first
    const addHitId = renderer.hitTestAddButton(world.x, world.y);
    if (addHitId) {
      const doc = useDocumentStore.getState();
      const ui = useUIStore.getState();
      const newId = doc.addChildTopic(addHitId);
      ui.selectTopic(newId);
      setTimeout(() => ui.startEditing(newId), 50);
      return;
    }

    // Check collapse indicator
    const collapseHitId = renderer.hitTestCollapse(world.x, world.y);
    if (collapseHitId) {
      useDocumentStore.getState().toggleCollapse(collapseHitId);
      return;
    }

    const hitId = renderer.hitTest(world.x, world.y);

    if (hitId) {
      useUIStore.getState().selectTopic(hitId, e.metaKey || e.ctrlKey);
    } else {
      useUIStore.getState().clearSelection();

      // Start panning
      const handlePanMove = (moveEvent: MouseEvent) => {
        const currentZoom = useUIStore.getState().camera.zoom;
        const dx = moveEvent.movementX / currentZoom;
        const dy = moveEvent.movementY / currentZoom;
        useUIStore.getState().pan(dx, dy);
      };

      const handlePanUp = () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanUp);
      };

      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanUp);
    }
  }, [getWorldCoords]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const world = getWorldCoords(e);
    if (!world) return;

    const hitId = renderer.hitTest(world.x, world.y);
    if (hitId) {
      useUIStore.getState().startEditing(hitId);
    }
  }, [getWorldCoords]);

  // Arrow key navigation helper
  const findAdjacentTopic = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const layout = layoutRef.current;
    const ui = useUIStore.getState();
    const selectedId = ui.selectedTopicIds[0];
    if (!layout || !selectedId) return null;

    const currentNode = layout.nodes.get(selectedId);
    if (!currentNode) return null;

    const rootTopic = useDocumentStore.getState().getRootTopic();

    const findParent = (root: Topic, targetId: string): Topic | null => {
      for (const child of root.children.attached) {
        if (child.id === targetId) return root;
        const found = findParent(child, targetId);
        if (found) return found;
      }
      return null;
    };

    const parent = findParent(rootTopic, selectedId);

    switch (direction) {
      case 'left': {
        if (currentNode.branchDirection !== 'left' && parent) {
          return parent.id;
        }
        if (currentNode.topic.children.attached.length > 0 && !currentNode.topic.collapsed) {
          return currentNode.topic.children.attached[0].id;
        }
        return null;
      }
      case 'right': {
        if (currentNode.branchDirection === 'left' && parent) {
          return parent.id;
        }
        if (currentNode.topic.children.attached.length > 0 && !currentNode.topic.collapsed) {
          return currentNode.topic.children.attached[0].id;
        }
        return null;
      }
      case 'up':
      case 'down': {
        if (!parent) return null;
        const siblings = parent.children.attached;
        const idx = siblings.findIndex(c => c.id === selectedId);
        if (idx < 0) return null;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx >= 0 && newIdx < siblings.length) {
          return siblings[newIdx].id;
        }
        return null;
      }
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ui = useUIStore.getState();

      // Global shortcuts (work even when editing)
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          saveFile(e.shiftKey).catch(console.error);
          return;
        }
        if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          openFile().then(() => {
            ui.clearSelection();
            ui.resetView();
          }).catch(console.error);
          return;
        }
        if ((e.key === 'f' || e.key === 'F') && e.shiftKey) {
          e.preventDefault();
          ui.toggleZenMode();
          return;
        }
      }

      // ESC exits Zen Mode
      if (e.key === 'Escape' && ui.isZenMode) {
        e.preventDefault();
        ui.setZenMode(false);
        return;
      }

      // Don't handle if editing text
      if (ui.editingTopicId) return;

      const selected = ui.selectedTopicIds[0];
      if (!selected) return;

      const doc = useDocumentStore.getState();

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          const newId = doc.addChildTopic(selected);
          ui.selectTopic(newId);
          setTimeout(() => ui.startEditing(newId), 50);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const sibId = doc.addSiblingTopic(selected);
          if (sibId) {
            ui.selectTopic(sibId);
            setTimeout(() => ui.startEditing(sibId), 50);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          doc.deleteTopic(selected);
          ui.clearSelection();
          break;
        }
        case ' ': {
          e.preventDefault();
          doc.toggleCollapse(selected);
          break;
        }
        case 'F2': {
          e.preventDefault();
          ui.startEditing(selected);
          break;
        }
        case 'Escape': {
          ui.clearSelection();
          break;
        }
        // Arrow key navigation
        case 'ArrowUp': {
          e.preventDefault();
          const upId = findAdjacentTopic('up');
          if (upId) ui.selectTopic(upId);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const downId = findAdjacentTopic('down');
          if (downId) ui.selectTopic(downId);
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const leftId = findAdjacentTopic('left');
          if (leftId) ui.selectTopic(leftId);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const rightId = findAdjacentTopic('right');
          if (rightId) ui.selectTopic(rightId);
          break;
        }
        case 'z':
        case 'Z': {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
              useDocumentStore.temporal.getState().redo();
            } else {
              useDocumentStore.temporal.getState().undo();
            }
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [findAdjacentTopic]);

  // Edit input handlers
  const handleEditSubmit = useCallback(() => {
    const input = editInput;
    if (input) {
      useDocumentStore.getState().updateTopicTitle(input.topicId, input.value);
    }
    useUIStore.getState().stopEditing();
    setEditInput(null);
  }, [editInput]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEditSubmit();
      } else if (e.key === 'Escape') {
        useUIStore.getState().stopEditing();
        setEditInput(null);
      }
      e.stopPropagation();
    },
    [handleEditSubmit],
  );

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-default"
        style={{ display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        tabIndex={0}
      />
      {editInput && (
        <input
          type="text"
          autoFocus
          value={editInput.value}
          onChange={(e) => setEditInput({ ...editInput, value: e.target.value })}
          onBlur={handleEditSubmit}
          onKeyDown={handleEditKeyDown}
          className="absolute border-2 border-blue-500 rounded-lg px-2 outline-none bg-white text-center"
          style={{
            left: editInput.x,
            top: editInput.y,
            width: Math.max(editInput.width, 120),
            height: editInput.height,
            fontSize: `${14 * camera.zoom}px`,
            lineHeight: `${editInput.height}px`,
          }}
        />
      )}
    </div>
  );
}
