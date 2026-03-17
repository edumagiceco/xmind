import {
  Plus, Minus, RotateCcw, ZoomIn, ZoomOut,
  Undo2, Redo2, FileDown, FolderOpen, FilePlus,
  PanelRight,
} from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { saveFile, openFile, newFile } from '../../services/tauriBridge';

export function MainToolbar() {
  const addChildTopic = useDocumentStore((s) => s.addChildTopic);
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  const zoom = useUIStore((s) => s.zoom);
  const resetView = useUIStore((s) => s.resetView);
  const camera = useUIStore((s) => s.camera);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleUndo = () => useDocumentStore.temporal.getState().undo();
  const handleRedo = () => useDocumentStore.temporal.getState().redo();

  const handleAddChild = () => {
    const selected = selectedTopicIds[0];
    if (selected) addChildTopic(selected);
  };

  const handleZoomIn = () => zoom(1.2, { x: 640, y: 400 });
  const handleZoomOut = () => zoom(0.8, { x: 640, y: 400 });

  const handleNew = () => {
    newFile();
    useUIStore.getState().clearSelection();
    useUIStore.getState().resetView();
  };

  const handleOpen = async () => {
    try {
      await openFile();
      useUIStore.getState().clearSelection();
      useUIStore.getState().resetView();
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  };

  const handleSave = async () => {
    try {
      await saveFile();
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  };

  const zoomPercent = Math.round(camera.zoom * 100);

  return (
    <div className="h-12 flex items-center px-4 gap-1 border-b"
      style={{ backgroundColor: 'var(--toolbar-bg)', borderColor: 'var(--toolbar-border)' }}>
      {/* File operations */}
      <ToolbarButton icon={<FilePlus size={18} />} title="New" onClick={handleNew} />
      <ToolbarButton icon={<FolderOpen size={18} />} title="Open" onClick={handleOpen} />
      <ToolbarButton icon={<FileDown size={18} />} title="Save (⌘S)" onClick={handleSave} />

      <Divider />

      {/* Edit operations */}
      <ToolbarButton icon={<Undo2 size={18} />} title="Undo (⌘Z)" onClick={handleUndo} />
      <ToolbarButton icon={<Redo2 size={18} />} title="Redo (⌘⇧Z)" onClick={handleRedo} />

      <Divider />

      {/* Topic operations */}
      <ToolbarButton
        icon={<Plus size={18} />}
        title="Add Child Topic (Tab)"
        onClick={handleAddChild}
        disabled={selectedTopicIds.length === 0}
      />
      <ToolbarButton
        icon={<Minus size={18} />}
        title="Delete Topic (Delete)"
        onClick={() => {
          const selected = selectedTopicIds[0];
          if (selected) useDocumentStore.getState().deleteTopic(selected);
        }}
        disabled={selectedTopicIds.length === 0}
      />

      <div className="flex-1" />

      <ToolbarButton icon={<PanelRight size={18} />} title="Toggle Sidebar" onClick={toggleSidebar} />

      <Divider />

      {/* Zoom controls */}
      <ToolbarButton icon={<ZoomOut size={18} />} title="Zoom Out" onClick={handleZoomOut} />
      <span className="text-xs text-gray-500 w-12 text-center select-none">{zoomPercent}%</span>
      <ToolbarButton icon={<ZoomIn size={18} />} title="Zoom In" onClick={handleZoomIn} />
      <ToolbarButton icon={<RotateCcw size={16} />} title="Reset View" onClick={resetView} />
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="p-1.5 rounded hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}
