import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { MindMapCanvas } from './components/Canvas/MindMapCanvas';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useUIStore } from './store/uiStore';
import { useDocumentStore } from './store/documentStore';
import { openFile, saveFile, newFile } from './services/tauriBridge';

async function handleQuit() {
  const isDirty = useDocumentStore.getState().isDirty;
  if (isDirty) {
    const answer = confirm('저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?');
    if (answer) {
      try {
        await saveFile(false);
      } catch (e) {
        console.error(e);
        const forceQuit = confirm('저장에 실패했습니다. 그래도 종료하시겠습니까?');
        if (!forceQuit) return;
      }
    }
  }
  getCurrentWindow().destroy();
}

function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  // Listen for native menu events from Tauri
  useEffect(() => {
    const unlisten = listen<string>('menu-event', (event) => {
      const ui = useUIStore.getState();
      switch (event.payload) {
        case 'new_file':
          newFile();
          ui.clearSelection();
          ui.resetView();
          break;
        case 'open_file':
          openFile().then(() => {
            ui.clearSelection();
            ui.resetView();
          }).catch((e) => { console.error(e); alert(`파일 열기 실패: ${e}`); });
          break;
        case 'save_file':
          saveFile(false).catch((e) => { console.error(e); alert(`저장 실패: ${e}`); });
          break;
        case 'save_as':
          saveFile(true).catch((e) => { console.error(e); alert(`저장 실패: ${e}`); });
          break;
        case 'undo':
          useDocumentStore.temporal.getState().undo();
          break;
        case 'redo':
          useDocumentStore.temporal.getState().redo();
          break;
        case 'quit':
          handleQuit();
          break;
      }
    });

    // Intercept window close button (X button)
    const unlistenClose = getCurrentWindow().onCloseRequested(async (event) => {
      const isDirty = useDocumentStore.getState().isDirty;
      if (isDirty) {
        event.preventDefault();
        await handleQuit();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenClose.then((fn) => fn());
    };
  }, []);

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
