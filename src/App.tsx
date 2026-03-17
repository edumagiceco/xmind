import { MindMapCanvas } from './components/Canvas/MindMapCanvas';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useUIStore } from './store/uiStore';

function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex flex-col w-full h-full">
      <MainToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <MindMapCanvas />
        </div>
        {sidebarOpen && <Sidebar />}
      </div>
    </div>
  );
}

export default App;
