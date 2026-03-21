import { X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { StylePanel } from './StylePanel';
import { MapPanel } from './MapPanel';
import { NotesPanel } from './NotesPanel';

const TABS = [
  { key: 'style' as const, label: 'Style' },
  { key: 'map' as const, label: 'Map' },
  { key: 'notes' as const, label: 'Notes' },
];

export function Sidebar() {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  if (!sidebarOpen) return null;

  return (
    <div className="w-72 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
        <div className="flex flex-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSidebarTab(key)}
              className={`flex-1 text-sm py-2.5 font-medium transition-colors relative ${
                sidebarTab === key
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
              {sidebarTab === key && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-t" />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="p-1.5 mr-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          title="Close Sidebar"
          onClick={toggleSidebar}
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {sidebarTab === 'style' && <StylePanel />}
        {sidebarTab === 'map' && <MapPanel />}
        {sidebarTab === 'notes' && <NotesPanel />}
      </div>
    </div>
  );
}

export default Sidebar;
