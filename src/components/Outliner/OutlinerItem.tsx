import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Topic } from '../../model/types';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';

interface OutlinerItemProps {
  topic: Topic;
  depth: number;
  isRoot?: boolean;
}

export function OutlinerItem({ topic, depth, isRoot = false }: OutlinerItemProps) {
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  const selectTopic = useUIStore((s) => s.selectTopic);
  const addChildTopic = useDocumentStore((s) => s.addChildTopic);
  const addSiblingTopic = useDocumentStore((s) => s.addSiblingTopic);
  const deleteTopic = useDocumentStore((s) => s.deleteTopic);
  const updateTopicTitle = useDocumentStore((s) => s.updateTopicTitle);
  const toggleCollapse = useDocumentStore((s) => s.toggleCollapse);
  const startEditing = useUIStore((s) => s.startEditing);
  const stopEditing = useUIStore((s) => s.stopEditing);
  const editingTopicId = useUIStore((s) => s.editingTopicId);

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
    selectTopic(topic.id, e.metaKey || e.ctrlKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startEditing(topic.id);
  };

  const handleEditSubmit = () => {
    updateTopicTitle(topic.id, editValue);
    stopEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEditSubmit();
      } else if (e.key === 'Escape') {
        setEditValue(topic.title);
        stopEditing();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const newId = addChildTopic(topic.id);
      selectTopic(newId);
      setTimeout(() => startEditing(newId), 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isRoot) {
        const newId = addSiblingTopic(topic.id);
        if (newId) {
          selectTopic(newId);
          setTimeout(() => startEditing(newId), 50);
        }
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isRoot) {
        e.preventDefault();
        deleteTopic(topic.id);
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      startEditing(topic.id);
    } else if (e.key === ' ') {
      if (hasChildren) {
        e.preventDefault();
        toggleCollapse(topic.id);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer rounded-sm group ${
          isSelected
            ? 'bg-blue-50 border-l-2 border-blue-500'
            : 'hover:bg-gray-100 border-l-2 border-transparent'
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
            hasChildren ? 'text-gray-400 hover:text-gray-600' : 'invisible'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleCollapse(topic.id);
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
            className="flex-1 text-sm px-1 py-0.5 border border-blue-400 rounded outline-none bg-white min-w-0"
          />
        ) : (
          <span
            className={`flex-1 text-sm truncate ${
              depth === 0 ? 'font-semibold text-gray-800' : 'text-gray-700'
            }`}
          >
            {topic.title}
          </span>
        )}

        {/* Notes indicator */}
        {topic.notes && topic.notes.length > 0 && (
          <span className="w-2 h-2 bg-amber-400 rounded-sm flex-shrink-0" title="메모 있음" />
        )}

        {/* Actions (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            title="하위 토픽 추가"
            onClick={(e) => {
              e.stopPropagation();
              const newId = addChildTopic(topic.id);
              selectTopic(newId);
              setTimeout(() => startEditing(newId), 50);
            }}
          >
            <Plus size={12} />
          </button>
          {!isRoot && (
            <button
              className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
              title="삭제"
              onClick={(e) => {
                e.stopPropagation();
                deleteTopic(topic.id);
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
}
