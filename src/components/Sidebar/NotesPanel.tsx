import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import type { Topic } from '../../model/types';
import { findTopicById } from '../../utils/topicLookup';

function getNotesText(topic: Topic): string {
  if (!topic.notes || topic.notes.length === 0) return '';
  return topic.notes
    .map((block) => block.children.map((span) => span.text).join(''))
    .join('\n');
}

export function NotesPanel() {
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  const rootTopic = useDocumentStore((s) => s.getRootTopic());
  const updateTopicNotes = useDocumentStore((s) => s.updateTopicNotes);

  const topicId = selectedTopicIds[0];
  const topic = topicId ? findTopicById(rootTopic, topicId) : null;

  const [text, setText] = useState('');

  useEffect(() => {
    setText(topic ? getNotesText(topic) : '');
  }, [topicId, topic?.notes]);

  const handleSave = useCallback(() => {
    if (topicId) {
      updateTopicNotes(topicId, text);
    }
  }, [topicId, text, updateTopicNotes]);

  if (!topic) {
    return (
      <div className="text-sm text-gray-400 text-center mt-8 px-4">
        토픽을 선택하면 메모를 편집할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {topic.title}
        </h3>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        placeholder="메모를 입력하세요..."
        className="flex-1 w-full min-h-[200px] p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
      />
      <p className="text-[10px] text-gray-400 mt-2">포커스를 벗어나면 자동 저장됩니다.</p>
    </div>
  );
}
