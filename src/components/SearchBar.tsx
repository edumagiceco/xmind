import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import { useUIStore } from '../store/uiStore';
import type { Topic } from '../model/types';

function collectAllTopics(topic: Topic, results: Topic[]) {
  results.push(topic);
  for (const child of topic.children.attached) {
    collectAllTopics(child, results);
  }
  for (const child of topic.children.detached) {
    collectAllTopics(child, results);
  }
}

interface SearchBarProps {
  onClose: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Topic[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootTopic = useDocumentStore((s) => s.getRootTopic());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setCurrentIdx(0);
      return;
    }

    const all: Topic[] = [];
    collectAllTopics(rootTopic, all);
    const q = query.toLowerCase();
    const found = all.filter((t) => t.title.toLowerCase().includes(q));
    setMatches(found);
    setCurrentIdx(0);

    // Select first match
    if (found.length > 0) {
      useUIStore.getState().selectTopic(found[0].id);
    }
  }, [query, rootTopic]);

  const navigateTo = useCallback((idx: number) => {
    if (matches.length === 0) return;
    const wrapped = ((idx % matches.length) + matches.length) % matches.length;
    setCurrentIdx(wrapped);
    useUIStore.getState().selectTopic(matches[wrapped].id);
  }, [matches]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        navigateTo(currentIdx - 1);
      } else {
        navigateTo(currentIdx + 1);
      }
    }
  };

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-lg shadow-lg px-3 py-1.5 min-w-[320px]">
      <Search size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="토픽 검색..."
        className="flex-1 text-sm outline-none bg-transparent px-1"
      />
      {matches.length > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          {currentIdx + 1}/{matches.length}
        </span>
      )}
      {query && matches.length === 0 && (
        <span className="text-xs text-red-400 flex-shrink-0">없음</span>
      )}
      <button
        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
        onClick={() => navigateTo(currentIdx - 1)}
        title="이전 (Shift+Enter)"
      >
        <ChevronUp size={14} />
      </button>
      <button
        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
        onClick={() => navigateTo(currentIdx + 1)}
        title="다음 (Enter)"
      >
        <ChevronDown size={14} />
      </button>
      <button
        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
        onClick={onClose}
        title="닫기 (Esc)"
      >
        <X size={14} />
      </button>
    </div>
  );
}
