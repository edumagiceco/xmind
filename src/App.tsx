import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ask } from '@tauri-apps/plugin-dialog';
import { MindMapCanvas } from './components/Canvas/MindMapCanvas';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ZenModeOverlay } from './components/ZenModeOverlay';
import { OutlinerView } from './components/Outliner/OutlinerView';
import { useUIStore } from './store/uiStore';
import { useDocumentStore } from './store/documentStore';
import { openFile, saveFile, newFile } from './services/tauriBridge';

const isTauri = !!(window as unknown as { __TAURI__: unknown }).__TAURI__;

async function exitApp() {
  if (isTauri) {
    const { exit } = await import('@tauri-apps/plugin-process');
    await exit(0);
  }
}

async function handleQuit() {
  try {
    const isDirty = useDocumentStore.getState().isDirty;
    if (isDirty) {
      const shouldSave = await ask('저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?', {
        title: 'MindForge',
        kind: 'warning',
        okLabel: '저장',
        cancelLabel: '저장 안 함',
      });
      if (shouldSave) {
        try {
          await saveFile(false);
        } catch (e) {
          console.error('Save failed:', e);
          const forceQuit = await ask('저장에 실패했습니다. 그래도 종료하시겠습니까?', {
            title: 'MindForge',
            kind: 'error',
            okLabel: '종료',
            cancelLabel: '취소',
          });
          if (!forceQuit) return;
        }
      }
    }
  } catch (e) {
    console.error('Quit dialog error:', e);
  }
  await exitApp();
}

function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const isZenMode = useUIStore((s) => s.isZenMode);
  const viewMode = useUIStore((s) => s.viewMode);

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

    // Intercept window close button (X button) - Tauri only
    let unlistenClose: Promise<() => void> | null = null;
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        unlistenClose = getCurrentWindow().onCloseRequested(async (event) => {
          const isDirty = useDocumentStore.getState().isDirty;
          if (isDirty) {
            event.preventDefault();
            await handleQuit();
          }
        });
      });
    }

    return () => {
      unlisten.then((fn) => fn());
      unlistenClose?.then((fn) => fn());
    };
  }, []);

  if (isZenMode) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex-1 relative">
          <MindMapCanvas />
        </div>
        <ZenModeOverlay />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <MainToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {viewMode === 'map' ? <MindMapCanvas /> : <OutlinerView />}
        </div>
        {sidebarOpen && <Sidebar />}
      </div>
    </div>
  );
}

export default App;
