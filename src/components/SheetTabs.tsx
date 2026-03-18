import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import { useUIStore } from '../store/uiStore';

export function SheetTabs() {
  const workbook = useDocumentStore((s) => s.workbook);
  const activeSheetId = useDocumentStore((s) => s.activeSheetId);
  const setActiveSheet = useDocumentStore((s) => s.setActiveSheet);
  const addSheet = useDocumentStore((s) => s.addSheet);
  const removeSheet = useDocumentStore((s) => s.removeSheet);
  const renameSheet = useDocumentStore((s) => s.renameSheet);

  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const sheets = workbook.sheets;

  const handleDoubleClick = (sheetId: string, title: string) => {
    setEditingSheetId(sheetId);
    setEditValue(title);
  };

  const handleRenameSubmit = () => {
    if (editingSheetId && editValue.trim()) {
      renameSheet(editingSheetId, editValue.trim());
    }
    setEditingSheetId(null);
  };

  const handleAdd = () => {
    const newId = addSheet();
    useUIStore.getState().clearSelection();
    useUIStore.getState().resetView();
    setActiveSheet(newId);
  };

  const handleRemove = (sheetId: string) => {
    if (sheets.length <= 1) return;
    removeSheet(sheetId);
    useUIStore.getState().clearSelection();
    useUIStore.getState().resetView();
  };

  const handleSelect = (sheetId: string) => {
    if (sheetId === activeSheetId) return;
    setActiveSheet(sheetId);
    useUIStore.getState().clearSelection();
    useUIStore.getState().resetView();
  };

  if (sheets.length <= 1) return null;

  return (
    <div className="h-8 flex items-center bg-gray-50 border-t border-gray-200 px-2 gap-0.5 flex-shrink-0">
      {sheets.map((sheet) => {
        const isActive = sheet.id === activeSheetId;
        const isEditing = editingSheetId === sheet.id;

        return (
          <div
            key={sheet.id}
            className={`group flex items-center gap-1 px-3 py-1 rounded-t text-xs cursor-pointer select-none transition-colors ${
              isActive
                ? 'bg-white border border-b-0 border-gray-200 text-blue-600 font-medium -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => handleSelect(sheet.id)}
            onDoubleClick={() => handleDoubleClick(sheet.id, sheet.title)}
          >
            {isEditing ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setEditingSheetId(null);
                }}
                className="text-xs border border-blue-400 rounded px-1 outline-none w-20 bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate max-w-[100px]">{sheet.title}</span>
            )}
            {sheets.length > 1 && isActive && !isEditing && (
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(sheet.id);
                }}
                title="시트 삭제"
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
      <button
        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 ml-1"
        onClick={handleAdd}
        title="새 시트 추가"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
