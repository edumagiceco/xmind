import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasRenderer } from '../../canvas/CanvasRenderer';
import { computeLayout } from '../../layout/LayoutEngine';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { saveFile, openFile } from '../../services/tauriBridge';
import type { LayoutResult } from '../../layout/types';
import type { Topic } from '../../model/types';
import { pasteImageFromClipboard } from '../../utils/imagePicker';

export function MindMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const layoutRef = useRef<LayoutResult | null>(null);
  const dropTargetRef = useRef<{ targetId: string; position: 'child' | 'before' | 'after' } | null>(null);
  const isDraggingRef = useRef(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

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
    renderer.setRelationships(sheet.relationships);
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

    // Suppress hover during drag
    if (isDraggingRef.current) return;

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

      // Prepare for potential drag
      const startScreenX = e.clientX;
      const startScreenY = e.clientY;
      const rootId = useDocumentStore.getState().getRootTopic().id;
      let isDragging = false;

      const handleDragMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startScreenX;
        const dy = moveEvent.clientY - startScreenY;

        // Start drag after 5px threshold
        if (!isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
          // Root topic drag → pan the camera instead
          if (hitId === rootId) {
            isDragging = true;
            isDraggingRef.current = true;
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
          } else {
            isDragging = true;
            isDraggingRef.current = true;
            useUIStore.getState().setHoveredTopic(null);
            const startWorld = renderer.camera.screenToWorld(
              moveEvent.clientX - canvasRef.current!.getBoundingClientRect().left,
              moveEvent.clientY - canvasRef.current!.getBoundingClientRect().top,
              renderer.canvasWidth, renderer.canvasHeight,
            );
            renderer.setDragState(hitId, startWorld.x, startWorld.y);
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
          }
        }

        // Root drag → pan camera
        if (isDragging && hitId === rootId) {
          const currentZoom = useUIStore.getState().camera.zoom;
          useUIStore.getState().pan(moveEvent.movementX / currentZoom, moveEvent.movementY / currentZoom);
          return;
        }

        if (isDragging) {
          const rect = canvasRef.current!.getBoundingClientRect();
          const screenX = moveEvent.clientX - rect.left;
          const screenY = moveEvent.clientY - rect.top;
          const worldCoords = renderer.camera.screenToWorld(
            screenX, screenY,
            renderer.canvasWidth, renderer.canvasHeight,
          );

          renderer.updateDragPosition(worldCoords.x, worldCoords.y);

          const dropTarget = renderer.findDropTarget(worldCoords.x, worldCoords.y, hitId);
          if (dropTarget) {
            renderer.setDropTarget(dropTarget.targetId, dropTarget.position);
            dropTargetRef.current = dropTarget;
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
          } else {
            renderer.setDropTarget(null, null);
            dropTargetRef.current = null;
            if (canvasRef.current) canvasRef.current.style.cursor = 'not-allowed';
          }
        }
      };

      const handleDragUp = () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragUp);

        if (isDragging && hitId === rootId) {
          // Root drag complete — just clean up
          isDraggingRef.current = false;
          if (canvasRef.current) canvasRef.current.style.cursor = 'default';
          return;
        }

        if (isDragging) {
          // Execute the drop
          const doc = useDocumentStore.getState();
          const sheet = doc.getActiveSheet();

          if (dropTargetRef.current) {
            const { targetId, position } = dropTargetRef.current;

            // Find target's parent for before/after positions
            const findParent = (root: Topic, tid: string): Topic | null => {
              for (const child of root.children.attached) {
                if (child.id === tid) return root;
                const found = findParent(child, tid);
                if (found) return found;
              }
              return null;
            };

            if (position === 'child') {
              doc.moveTopic(hitId, targetId);
            } else {
              const parent = findParent(sheet.rootTopic, targetId);
              if (parent) {
                const targetIdx = parent.children.attached.findIndex(c => c.id === targetId);
                const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
                doc.moveTopic(hitId, parent.id, insertIdx);
              }
            }
          }

          renderer.clearDragState();
          dropTargetRef.current = null;
          isDraggingRef.current = false;
          if (canvasRef.current) canvasRef.current.style.cursor = 'default';
        }
      };

      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragUp);
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

  // Arrow key navigation helper — spatial navigation for up/down
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
        // Spatial navigation: find the visually closest node in the direction
        const cx = currentNode.x + currentNode.width / 2;
        const cy = currentNode.y + currentNode.height / 2;
        let bestId: string | null = null;
        let bestScore = Infinity;

        for (const [id, node] of layout.nodes) {
          if (id === selectedId) continue;
          const nx = node.x + node.width / 2;
          const ny = node.y + node.height / 2;
          const dy = ny - cy;

          // Filter: must be in the correct direction (with min threshold)
          if (direction === 'down' && dy <= 5) continue;
          if (direction === 'up' && dy >= -5) continue;

          const absDy = Math.abs(dy);
          const absDx = Math.abs(nx - cx);

          // Score: prefer vertical proximity with horizontal alignment penalty
          // Nodes at similar X position are strongly preferred
          const score = absDy + absDx * 3;

          if (score < bestScore) {
            bestScore = score;
            bestId = id;
          }
        }

        return bestId;
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
        // Cmd+= / Cmd+- : zoom in/out, Cmd+0 : reset
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          ui.zoom(1.2, { x: 0, y: 0 });
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          ui.zoom(1 / 1.2, { x: 0, y: 0 });
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          ui.resetView();
          return;
        }
      }

      // ESC exits Zen Mode
      if (e.key === 'Escape' && ui.isZenMode) {
        e.preventDefault();
        ui.setZenMode(false);
        return;
      }

      // Copy/Cut/Paste work even without editing check (but not while editing text)
      if ((e.metaKey || e.ctrlKey) && !ui.editingTopicId) {
        const selected = ui.selectedTopicIds[0];
        if (e.key === 'c' || e.key === 'C') {
          if (selected && !e.shiftKey) {
            e.preventDefault();
            const copied = useDocumentStore.getState().copyTopic(selected);
            if (copied) ui.setClipboard(copied);
            return;
          }
        }
        if (e.key === 'x' || e.key === 'X') {
          if (selected && !e.shiftKey) {
            e.preventDefault();
            const cut = useDocumentStore.getState().cutTopic(selected);
            if (cut) {
              ui.setClipboard(cut);
              ui.clearSelection();
            }
            return;
          }
        }
        if (e.key === 'v' || e.key === 'V') {
          if (selected && !e.shiftKey) {
            if (ui.clipboard) {
              e.preventDefault();
              const newId = useDocumentStore.getState().pasteTopic(selected, ui.clipboard);
              ui.selectTopic(newId);
              return;
            }
            // No topic clipboard — try pasting image from system clipboard
            e.preventDefault();
            pasteImageFromClipboard().then((img) => {
              if (img) {
                useDocumentStore.getState().updateTopicImage(selected, img);
              }
            });
            return;
          }
        }
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
          // If single node selected and it has an image, delete the image first
          if (ui.selectedTopicIds.length === 1) {
            const rootTopic = doc.getRootTopic();
            const findT = (root: Topic, id: string): Topic | null => {
              if (root.id === id) return root;
              for (const c of root.children.attached) {
                const r = findT(c, id);
                if (r) return r;
              }
              return null;
            };
            const topic = findT(rootTopic, selected);
            if (topic?.image) {
              doc.updateTopicImage(selected, undefined);
              break;
            }
          }
          let nextId: string | null;
          if (ui.selectedTopicIds.length > 1) {
            nextId = doc.deleteTopics(ui.selectedTopicIds);
          } else {
            nextId = doc.deleteTopic(selected);
          }
          if (nextId) {
            ui.selectTopic(nextId);
          } else {
            ui.clearSelection();
          }
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
        // Arrow keys: Alt = reorder/promote/demote, plain = navigate
        case 'ArrowUp': {
          e.preventDefault();
          if (e.altKey) {
            doc.moveTopicUp(selected);
          } else {
            const upId = findAdjacentTopic('up');
            if (upId) ui.selectTopic(upId);
          }
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (e.altKey) {
            doc.moveTopicDown(selected);
          } else {
            const downId = findAdjacentTopic('down');
            if (downId) ui.selectTopic(downId);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (e.altKey) {
            doc.promoteTopic(selected);
          } else {
            const leftId = findAdjacentTopic('left');
            if (leftId) ui.selectTopic(leftId);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (e.altKey) {
            doc.demoteTopic(selected);
          } else {
            const rightId = findAdjacentTopic('right');
            if (rightId) ui.selectTopic(rightId);
          }
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
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Cmd+Enter: insert newline
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd } = textarea;
        const val = editInput!.value;
        const newValue = val.substring(0, selectionStart) + '\n' + val.substring(selectionEnd);
        setEditInput({ ...editInput!, value: newValue });
        // Restore cursor position after state update
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleEditSubmit();
      } else if (e.key === 'Escape') {
        useUIStore.getState().stopEditing();
        setEditInput(null);
      }
      e.stopPropagation();
    },
    [handleEditSubmit, editInput],
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
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: editInput.x,
            top: editInput.y,
            width: Math.max(editInput.width, 120),
            height: editInput.height,
          }}
        >
          <textarea
            ref={editInputRef}
            autoFocus
            value={editInput.value}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setEditInput({ ...editInput, value: e.target.value })}
            onBlur={handleEditSubmit}
            onKeyDown={handleEditKeyDown}
            rows={Math.max(editInput.value.split('\n').length, 1)}
            className="border-2 border-blue-500 rounded-lg px-2 py-0.5 outline-none bg-white text-center resize-none w-full"
            style={{
              fontSize: `${14 * camera.zoom}px`,
              lineHeight: '1.4',
              maxHeight: editInput.height,
            }}
          />
        </div>
      )}
    </div>
  );
}
