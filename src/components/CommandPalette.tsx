import { useState, useEffect, useRef, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import { useUIStore } from '../store/uiStore';
import { saveFile, openFile, newFile } from '../services/tauriBridge';
import { exportAsPng, exportAsSvg, exportAsPdf, exportAsMarkdown, downloadBlob, downloadSvg, downloadText } from '../services/exportService';
import { computeLayout } from '../layout/LayoutEngine';
import { CanvasRenderer } from '../canvas/CanvasRenderer';

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const doc = useDocumentStore.getState;
    const ui = useUIStore.getState;
    const selected = () => ui().selectedTopicIds[0];

    return [
      // File
      { id: 'new', label: '새 파일', category: '파일', shortcut: '⌘N', action: () => { newFile(); ui().clearSelection(); ui().resetView(); } },
      { id: 'open', label: '파일 열기', category: '파일', shortcut: '⌘O', action: () => { openFile().catch(console.error); } },
      { id: 'save', label: '저장', category: '파일', shortcut: '⌘S', action: () => { saveFile().catch(console.error); } },
      { id: 'save-as', label: '다른 이름으로 저장', category: '파일', shortcut: '⌘⇧S', action: () => { saveFile(true).catch(console.error); } },
      // Edit
      { id: 'undo', label: '실행 취소', category: '편집', shortcut: '⌘Z', action: () => useDocumentStore.temporal.getState().undo() },
      { id: 'redo', label: '다시 실행', category: '편집', shortcut: '⌘⇧Z', action: () => useDocumentStore.temporal.getState().redo() },
      { id: 'add-child', label: '하위 토픽 추가', category: '편집', shortcut: 'Tab', action: () => { const s = selected(); if (s) { const id = doc().addChildTopic(s); ui().selectTopic(id); } } },
      { id: 'add-sibling', label: '형제 토픽 추가', category: '편집', shortcut: 'Enter', action: () => { const s = selected(); if (s) { const id = doc().addSiblingTopic(s); if (id) ui().selectTopic(id); } } },
      { id: 'delete', label: '토픽 삭제', category: '편집', shortcut: 'Delete', action: () => {
        const ids = ui().selectedTopicIds;
        let nextId: string | null = null;
        if (ids.length > 1) { nextId = doc().deleteTopics(ids); }
        else if (ids.length === 1) { nextId = doc().deleteTopic(ids[0]); }
        if (nextId) { ui().selectTopic(nextId); } else { ui().clearSelection(); }
      } },
      { id: 'copy', label: '토픽 복사', category: '편집', shortcut: '⌘C', action: () => { const s = selected(); if (s) { const copied = doc().copyTopic(s); if (copied) ui().setClipboard(copied); } } },
      { id: 'cut', label: '토픽 잘라내기', category: '편집', shortcut: '⌘X', action: () => { const s = selected(); if (s) { const cut = doc().cutTopic(s); if (cut) { ui().setClipboard(cut); ui().clearSelection(); } } } },
      { id: 'paste', label: '토픽 붙여넣기', category: '편집', shortcut: '⌘V', action: () => { const s = selected(); const clip = ui().clipboard; if (s && clip) { const newId = doc().pasteTopic(s, clip); ui().selectTopic(newId); } } },
      { id: 'edit', label: '토픽 이름 편집', category: '편집', shortcut: 'F2', action: () => { const s = selected(); if (s) ui().startEditing(s); } },
      // Move
      { id: 'move-up', label: '위로 이동', category: '이동', shortcut: '⌥↑', action: () => { const s = selected(); if (s) doc().moveTopicUp(s); } },
      { id: 'move-down', label: '아래로 이동', category: '이동', shortcut: '⌥↓', action: () => { const s = selected(); if (s) doc().moveTopicDown(s); } },
      { id: 'promote', label: '상위로 승격', category: '이동', shortcut: '⌥←', action: () => { const s = selected(); if (s) doc().promoteTopic(s); } },
      { id: 'demote', label: '하위로 강등', category: '이동', shortcut: '⌥→', action: () => { const s = selected(); if (s) doc().demoteTopic(s); } },
      // View
      { id: 'zen', label: 'Zen Mode', category: '보기', shortcut: '⌘⇧F', action: () => ui().toggleZenMode() },
      { id: 'outliner', label: '아웃라이너 뷰 전환', category: '보기', action: () => ui().toggleViewMode() },
      { id: 'sidebar', label: '사이드바 토글', category: '보기', action: () => ui().toggleSidebar() },
      { id: 'reset-view', label: '뷰 리셋', category: '보기', shortcut: '⌘0', action: () => ui().resetView() },
      // Export
      { id: 'export-png', label: 'PNG 내보내기', category: '내보내기', action: () => doExport('png') },
      { id: 'export-svg', label: 'SVG 내보내기', category: '내보내기', action: () => doExport('svg') },
      { id: 'export-pdf', label: 'PDF 내보내기', category: '내보내기', action: () => doExport('pdf') },
      { id: 'export-md', label: 'Markdown 내보내기', category: '내보내기', action: () => doExport('markdown') },
    ];
  }, []);

  const doExport = async (format: 'png' | 'svg' | 'pdf' | 'markdown') => {
    const sheet = useDocumentStore.getState().getActiveSheet();
    const baseName = useDocumentStore.getState().currentFilePath
      ? useDocumentStore.getState().currentFilePath!.split('/').pop()!.replace(/\.xmind$/i, '')
      : 'mindmap';

    if (format === 'markdown') {
      const md = exportAsMarkdown(sheet.rootTopic);
      downloadText(md, `${baseName}.md`, 'text/markdown');
      return;
    }

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = 1; tmpCanvas.height = 1;
    const tmpRenderer = new CanvasRenderer(tmpCanvas);
    const layout = computeLayout(sheet.rootTopic, sheet.structure, {
      measureText: (text, fontSize, fontWeight) => tmpRenderer.measureText(text, fontSize, fontWeight),
    });

    if (format === 'png') { const blob = await exportAsPng(layout, sheet.theme, sheet.structure, sheet.mapSettings); downloadBlob(blob, `${baseName}.png`); }
    else if (format === 'svg') { const svg = exportAsSvg(layout, sheet.theme, sheet.structure, sheet.mapSettings); downloadSvg(svg, `${baseName}.svg`); }
    else if (format === 'pdf') { const blob = await exportAsPdf(layout, sheet.theme, sheet.structure, sheet.mapSettings); downloadBlob(blob, `${baseName}.pdf`); }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [query, commands]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIdx]) {
        filtered[selectedIdx].action();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="bg-white border border-gray-300 rounded-xl shadow-2xl w-[420px] max-h-[400px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <Search size={16} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="명령어 검색..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <div ref={listRef} className="overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-6">결과 없음</div>
          )}
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                idx === selectedIdx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <div>
                <span className="text-[10px] text-gray-400 mr-2">{cmd.category}</span>
                {cmd.label}
              </div>
              {cmd.shortcut && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cmd.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
