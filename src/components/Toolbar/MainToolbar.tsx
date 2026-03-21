import { useState, useRef, useEffect } from 'react';
import {
  Plus, Minus, RotateCcw, ZoomIn, ZoomOut,
  Undo2, Redo2, FileDown, FolderOpen, FilePlus,
  PanelRight, Image, FileImage, Maximize, List, GitBranch,
  FileText, FileType, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { saveFile, openFile, newFile } from '../../services/tauriBridge';
import { exportAsPng, exportAsSvg, exportAsPdf, exportAsMarkdown, downloadBlob, downloadSvg, downloadText } from '../../services/exportService';
import { computeLayout } from '../../layout/LayoutEngine';
import { CanvasRenderer } from '../../canvas/CanvasRenderer';

function useFileName() {
  const filePath = useDocumentStore((s) => s.currentFilePath);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const name = filePath ? filePath.split('/').pop()!.replace(/\.xmind$/i, '') : 'Untitled';
  return isDirty ? `${name} *` : name;
}

export function MainToolbar() {
  const addChildTopic = useDocumentStore((s) => s.addChildTopic);
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  const zoom = useUIStore((s) => s.zoom);
  const resetView = useUIStore((s) => s.resetView);
  const camera = useUIStore((s) => s.camera);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const viewMode = useUIStore((s) => s.viewMode);
  const toggleViewMode = useUIStore((s) => s.toggleViewMode);
  const fileName = useFileName();

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
      alert(`파일 열기 실패: ${e}`);
    }
  };

  const handleSave = async () => {
    try {
      await saveFile();
    } catch (e) {
      console.error('Failed to save file:', e);
      alert(`파일 저장 실패: ${e}`);
    }
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  const handleExport = async (format: 'png' | 'svg' | 'pdf' | 'markdown') => {
    setExportMenuOpen(false);
    try {
      const sheet = useDocumentStore.getState().getActiveSheet();
      const baseName = useDocumentStore.getState().currentFilePath
        ? useDocumentStore.getState().currentFilePath!.split('/').pop()!.replace(/\.xmind$/i, '')
        : 'mindmap';

      if (format === 'markdown') {
        const md = exportAsMarkdown(sheet.rootTopic);
        downloadText(md, `${baseName}.md`, 'text/markdown');
        return;
      }

      // Image-based formats need layout
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = 1;
      tmpCanvas.height = 1;
      const tmpRenderer = new CanvasRenderer(tmpCanvas);
      const layout = computeLayout(sheet.rootTopic, sheet.structure, {
        measureText: (text, fontSize, fontWeight) => tmpRenderer.measureText(text, fontSize, fontWeight),
      });

      if (format === 'png') {
        const blob = await exportAsPng(layout, sheet.theme, sheet.structure, sheet.mapSettings);
        downloadBlob(blob, `${baseName}.png`);
      } else if (format === 'svg') {
        const svg = exportAsSvg(layout, sheet.theme, sheet.structure, sheet.mapSettings);
        downloadSvg(svg, `${baseName}.svg`);
      } else if (format === 'pdf') {
        const blob = await exportAsPdf(layout, sheet.theme, sheet.structure, sheet.mapSettings);
        downloadBlob(blob, `${baseName}.pdf`);
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert(`내보내기 실패: ${e}`);
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

      {/* Export dropdown */}
      <div className="relative" ref={exportMenuRef}>
        <ToolbarButton
          icon={<Image size={18} />}
          title="Export"
          onClick={() => setExportMenuOpen(!exportMenuOpen)}
        />
        {exportMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider">이미지</div>
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handleExport('png')}
            >
              <FileImage size={14} />
              PNG 내보내기
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handleExport('svg')}
            >
              <FileImage size={14} />
              SVG 내보내기
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handleExport('pdf')}
            >
              <FileText size={14} />
              PDF 내보내기
            </button>
            <div className="border-t border-gray-100 my-1" />
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider">문서</div>
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handleExport('markdown')}
            >
              <FileType size={14} />
              Markdown 내보내기
            </button>
          </div>
        )}
      </div>

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
          if (selected) {
            const nextId = useDocumentStore.getState().deleteTopic(selected);
            if (nextId) { useUIStore.getState().selectTopic(nextId); } else { useUIStore.getState().clearSelection(); }
          }
        }}
        disabled={selectedTopicIds.length === 0}
      />

      <Divider />

      {/* Reorder operations */}
      <ToolbarButton
        icon={<ArrowUp size={18} />}
        title="Move Up (⌥↑)"
        onClick={() => { const s = selectedTopicIds[0]; if (s) useDocumentStore.getState().moveTopicUp(s); }}
        disabled={selectedTopicIds.length === 0}
      />
      <ToolbarButton
        icon={<ArrowDown size={18} />}
        title="Move Down (⌥↓)"
        onClick={() => { const s = selectedTopicIds[0]; if (s) useDocumentStore.getState().moveTopicDown(s); }}
        disabled={selectedTopicIds.length === 0}
      />
      <ToolbarButton
        icon={<ArrowLeft size={18} />}
        title="Promote (⌥←)"
        onClick={() => { const s = selectedTopicIds[0]; if (s) useDocumentStore.getState().promoteTopic(s); }}
        disabled={selectedTopicIds.length === 0}
      />
      <ToolbarButton
        icon={<ArrowRight size={18} />}
        title="Demote (⌥→)"
        onClick={() => { const s = selectedTopicIds[0]; if (s) useDocumentStore.getState().demoteTopic(s); }}
        disabled={selectedTopicIds.length === 0}
      />

      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-gray-500 truncate max-w-[300px] select-none">{fileName}</span>
      </div>

      {/* View mode toggle */}
      <ToolbarButton
        icon={viewMode === 'map' ? <List size={18} /> : <GitBranch size={18} />}
        title={viewMode === 'map' ? 'Outliner View' : 'Map View'}
        onClick={toggleViewMode}
      />
      <ToolbarButton icon={<Maximize size={18} />} title="Zen Mode (⌘⇧F)" onClick={() => useUIStore.getState().toggleZenMode()} />
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
