import { useDocumentStore } from '../../store/documentStore';
import { useUIStore } from '../../store/uiStore';
import { OutlinerItem } from './OutlinerItem';

export function OutlinerView() {
  const rootTopic = useDocumentStore((s) => s.getRootTopic());
  const clearSelection = useUIStore((s) => s.clearSelection);

  return (
    <div
      className="w-full h-full overflow-auto bg-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) clearSelection();
      }}
    >
      <div className="max-w-3xl mx-auto py-6 px-4">
        <OutlinerItem topic={rootTopic} depth={0} isRoot />
      </div>
    </div>
  );
}
