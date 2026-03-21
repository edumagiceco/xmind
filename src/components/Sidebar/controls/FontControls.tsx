import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { TopicStyle, TextAlign } from '../../../model/types';
import { ColorPicker } from './ColorPicker';

const FONT_FAMILIES = [
  { value: '', label: 'System Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Pretendard', label: 'Pretendard' },
  { value: 'Noto Sans KR', label: 'Noto Sans KR' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

interface FontControlsProps {
  style: Partial<TopicStyle>;
  onChange: (style: Partial<TopicStyle>) => void;
}

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded border ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-600'
          : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

export function FontControls({ style, onChange }: FontControlsProps) {
  const hasUnderline = style.textDecoration?.includes('underline') ?? false;
  const hasLineThrough = style.textDecoration?.includes('line-through') ?? false;

  const toggleDecoration = (decoration: 'underline' | 'line-through') => {
    const current = style.textDecoration ?? 'none';
    const has = current.includes(decoration);

    let newParts: string[] = [];
    if (decoration === 'underline') {
      if (!has) newParts.push('underline');
      if (hasLineThrough) newParts.push('line-through');
    } else {
      if (hasUnderline) newParts.push('underline');
      if (!has) newParts.push('line-through');
    }

    const newValue = newParts.length > 0 ? newParts.join(' ') : 'none';
    onChange({ textDecoration: newValue as TopicStyle['textDecoration'] });
  };

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

      {/* Font size + Bold/Italic row */}
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
      </div>

      {/* Text formatting toggles */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Style</p>
        <div className="flex items-center gap-1">
          <ToggleButton
            active={style.fontWeight === 'bold'}
            onClick={() => onChange({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
            title="Bold"
          >
            <Bold size={14} />
          </ToggleButton>
          <ToggleButton
            active={style.fontStyle === 'italic'}
            onClick={() => onChange({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
            title="Italic"
          >
            <Italic size={14} />
          </ToggleButton>
          <ToggleButton
            active={hasLineThrough}
            onClick={() => toggleDecoration('line-through')}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </ToggleButton>
          <ToggleButton
            active={hasUnderline}
            onClick={() => toggleDecoration('underline')}
            title="Underline"
          >
            <Underline size={14} />
          </ToggleButton>
        </div>
      </div>

      {/* Text alignment */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Align</p>
        <div className="flex items-center gap-1">
          {([
            { value: 'left' as TextAlign, icon: AlignLeft, label: 'Left' },
            { value: 'center' as TextAlign, icon: AlignCenter, label: 'Center' },
            { value: 'right' as TextAlign, icon: AlignRight, label: 'Right' },
          ]).map(({ value, icon: Icon, label }) => (
            <ToggleButton
              key={value}
              active={(style.textAlign ?? 'center') === value}
              onClick={() => onChange({ textAlign: value })}
              title={label}
            >
              <Icon size={14} />
            </ToggleButton>
          ))}
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
