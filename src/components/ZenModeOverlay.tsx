import { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export function ZenModeOverlay() {
  const [visible, setVisible] = useState(false);
  const setZenMode = useUIStore((s) => s.setZenMode);
  const zoom = useUIStore((s) => s.zoom);
  const resetView = useUIStore((s) => s.resetView);
  const camera = useUIStore((s) => s.camera);
  const zoomPercent = Math.round(camera.zoom * 100);

  return (
    <>
      {/* Hover trigger area at top */}
      <div
        className="fixed top-0 left-0 right-0 h-4 z-50"
        onMouseEnter={() => setVisible(true)}
      />

      {/* Mini toolbar */}
      {visible && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center"
          onMouseLeave={() => setVisible(false)}
        >
          <div className="mt-2 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1.5 shadow-lg">
            <button
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Zoom Out"
              onClick={() => zoom(0.8, { x: window.innerWidth / 2, y: window.innerHeight / 2 })}
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-center select-none">{zoomPercent}%</span>
            <button
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Zoom In"
              onClick={() => zoom(1.2, { x: window.innerWidth / 2, y: window.innerHeight / 2 })}
            >
              <ZoomIn size={16} />
            </button>
            <button
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Reset View"
              onClick={resetView}
            >
              <RotateCcw size={14} />
            </button>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-1" />

            <button
              className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              title="Zen Mode 종료 (ESC)"
              onClick={() => setZenMode(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
