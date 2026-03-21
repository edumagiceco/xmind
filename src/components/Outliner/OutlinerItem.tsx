import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Topic } from '../../model/types';
import { useUIStore } from '../../store/uiStore';
import { useTopicActions } from '../../hooks/useTopicActions';

interface OutlinerItemProps {
  topic: Topic;
  depth: number;
  isRoot?: boolean;
}

export const OutlinerItem = React.memo(function OutlinerItem({ topic, depth, isRoot = false }: OutlinerItemProps) {
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  const editingTopicId = useUIStore((s) => s.editingTopicId);
  const { doc, ui } = useTopicActions();

  const isSelected = selectedTopicIds.includes(topic.id);
  const isEditing = editingTopicId === topic.id;
  const hasChildren = topic.children.attached.length > 0;
  const isCollapsed = topic.collapsed;

  const [editValue, setEditValue] = useState(topic.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(topic.title);
  }, [topic.title]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ui.selectTopic(topic.id, e.metaKey || e.ctrlKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ui.startEditing(topic.id);
  };

  const handleEditSubmit = () => {
    doc.updateTopicTitle(topic.id, editValue);
    ui.stopEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEditSubmit();
      } else if (e.key === 'Escape') {
        setEditValue(topic.title);
        ui.stopEditing();
      }
      return;
    }

    // Copy/Cut/Paste
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const copied = doc.copyTopic(topic.id);
        if (copied) ui.setClipboard(copied);
        return;
      }
      if ((e.key === 'x' || e.key === 'X') && !isRoot) {
        e.preventDefault();
        const cut = doc.cutTopic(topic.id);
        if (cut) { ui.setClipboard(cut); ui.clearSelection(); }
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        const clip = useUIStore.getState().clipboard;
        if (clip) {
          e.preventDefault();
          const newId = doc.pasteTopic(topic.id, clip);
          ui.selectTopic(newId);
        }
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const newId = doc.addChildTopic(topic.id);
      ui.selectTopic(newId);
      setTimeout(() => ui.startEditing(newId), 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isRoot) {
        const newId = doc.addSiblingTopic(topic.id);
        if (newId) {
          ui.selectTopic(newId);
          setTimeout(() => ui.startEditing(newId), 50);
        }
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isRoot) {
        e.preventDefault();
        const nextId = doc.deleteTopic(topic.id);
        if (nextId) { ui.selectTopic(nextId); } else { ui.clearSelection(); }
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      ui.startEditing(topic.id);
    } else if (e.key === ' ') {
      if (hasChildren) {
        e.preventDefault();
        doc.toggleCollapse(topic.id);
      }
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      doc.moveTopicUp(topic.id);
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      doc.moveTopicDown(topic.id);
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      doc.promoteTopic(topic.id);
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      doc.demoteTopic(topic.id);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer rounded-sm group ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Collapse toggle */}
        <button
          className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
            hasChildren ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300' : 'invisible'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) doc.toggleCollapse(topic.id);
          }}
        >
          {hasChildren && (isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />)}
        </button>

        {/* Bullet */}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            depth === 0 ? 'bg-blue-500' : depth === 1 ? 'bg-gray-500' : 'bg-gray-300'
          }`}
        />

        {/* Title */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm px-1 py-0.5 border border-blue-400 dark:border-blue-500 rounded outline-none bg-white dark:bg-gray-800 min-w-0"
          />
        ) : (
          <span
            className={`flex-1 text-sm truncate ${
              depth === 0 ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {topic.title}
          </span>
        )}

        {/* Notes indicator */}
        {topic.notes && topic.notes.length > 0 && (
          <span className="w-2 h-2 bg-amber-400 rounded-sm flex-shrink-0" title="메모 있음" />
        )}

        {/* Hyperlink indicator */}
        {topic.hyperlink && (
          <span className="text-[10px] flex-shrink-0" title={topic.hyperlink}>🔗</span>
        )}

        {/* Actions (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            title="하위 토픽 추가"
            onClick={(e) => {
              e.stopPropagation();
              const newId = doc.addChildTopic(topic.id);
              ui.selectTopic(newId);
              setTimeout(() => ui.startEditing(newId), 50);
            }}
          >
            <Plus size={12} />
          </button>
          {!isRoot && (
            <button
              className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
              title="삭제"
              onClick={(e) => {
                e.stopPropagation();
                const nextId = doc.deleteTopic(topic.id);
                if (nextId) { ui.selectTopic(nextId); } else { ui.clearSelection(); }
              }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {!isCollapsed &&
        topic.children.attached.map((child) => (
          <OutlinerItem key={child.id} topic={child} depth={depth + 1} />
        ))}
    </div>
  );
});
