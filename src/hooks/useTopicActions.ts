import { useDocumentStore } from '../store/documentStore';
import { useUIStore } from '../store/uiStore';

// Singleton refs to avoid re-creating on each render
const getDocActions = () => {
  const s = useDocumentStore.getState();
  return {
    addChildTopic: s.addChildTopic,
    addSiblingTopic: s.addSiblingTopic,
    deleteTopic: s.deleteTopic,
    deleteTopics: s.deleteTopics,
    copyTopic: s.copyTopic,
    cutTopic: s.cutTopic,
    pasteTopic: s.pasteTopic,
    updateTopicTitle: s.updateTopicTitle,
    toggleCollapse: s.toggleCollapse,
    moveTopicUp: s.moveTopicUp,
    moveTopicDown: s.moveTopicDown,
    promoteTopic: s.promoteTopic,
    demoteTopic: s.demoteTopic,
  };
};

const getUIActions = () => {
  const s = useUIStore.getState();
  return {
    selectTopic: s.selectTopic,
    clearSelection: s.clearSelection,
    startEditing: s.startEditing,
    stopEditing: s.stopEditing,
    setClipboard: s.setClipboard,
  };
};

export function useTopicActions() {
  // Use getState() directly to avoid subscribing to store changes
  // These are action functions that don't change between renders
  return { doc: getDocActions(), ui: getUIActions() };
}
