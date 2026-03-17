import { Bold } from 'lucide-react';
import type { TopicStyle } from '../../../model/types';
import { ColorPicker } from './ColorPicker';

const FONT_FAMILIES = [
  { value: '', label: 'System Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 24, 32];

interface FontControlsProps {
  style: Partial<TopicStyle>;
  onChange: (style: Partial<TopicStyle>) => void;
}

export function FontControls({ style, onChange }: FontControlsProps) {
  return (
    <div className="space-y-2.5">
      {/* Font family */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Font Family</p>
        <select
          value={style.fontFamily ?? ''}
          onChange={(e) => onChange({ fontFamily: e.target.value || undefined })}
          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font size + Bold toggle row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1">Size</p>
          <select
            value={style.fontSize ?? 14}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[10px] text-gray-400 mb-1">Bold</p>
          <button
            type="button"
            onClick={() =>
              onChange({
                fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold',
              })
            }
            className={`w-8 h-8 flex items-center justify-center rounded border ${
              style.fontWeight === 'bold'
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Bold size={14} />
          </button>
        </div>
      </div>

      {/* Font color */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Color</p>
        <ColorPicker
          value={style.fontColor}
          onChange={(color) => onChange({ fontColor: color })}
        />
      </div>
    </div>
  );
}
