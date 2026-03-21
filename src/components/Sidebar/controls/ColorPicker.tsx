import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const COLOR_GRID = [
  // Grayscale
  ['#ffffff', '#e8e8e8', '#d0d0d0', '#b0b0b0', '#909090', '#686868', '#383838', '#000000'],
  // Reds
  ['#ffe0e0', '#ffb3b3', '#ff8080', '#ff4d4d', '#ff1a1a', '#cc0000', '#990000', '#660000'],
  // Oranges
  ['#fff0e0', '#ffd9b3', '#ffc080', '#ffa64d', '#ff8c1a', '#cc7000', '#995400', '#663800'],
  // Yellows
  ['#fffde0', '#fff9b3', '#fff280', '#ffec4d', '#ffe61a', '#ccb800', '#998a00', '#665c00'],
  // Greens
  ['#e0ffe0', '#b3ffb3', '#80ff80', '#4dff4d', '#1aff1a', '#00cc00', '#009900', '#006600'],
  // Blues
  ['#e0f0ff', '#b3d9ff', '#80c0ff', '#4da6ff', '#1a8cff', '#0070cc', '#005499', '#003866'],
  // Purples
  ['#f0e0ff', '#d9b3ff', '#c080ff', '#a64dff', '#8c1aff', '#7000cc', '#540099', '#380066'],
];

interface ColorPickerProps {
  value: string | undefined;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value ?? '');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value ?? '');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !popupRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onChange(val);
    }
  };

  const handleHexBlur = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
      onChange(hexInput);
    } else {
      setHexInput(value ?? '');
    }
  };

  const selectColor = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  const displayColor = value && value !== 'transparent' ? value : undefined;
  const isNone = !value || value === 'transparent';

  return (
    <div className="relative">
      {/* Trigger: color swatch button */}
      <div className="flex items-center gap-2">
        {label && <p className="text-[10px] text-gray-400">{label}</p>}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-shadow ${
            isOpen ? 'border-blue-500 shadow-sm' : 'border-gray-300 hover:border-gray-400'
          }`}
          style={{ backgroundColor: displayColor ?? '#ffffff' }}
          title={displayColor ?? 'None'}
        >
          {isNone && <X size={12} className="text-gray-400" />}
        </button>
        {displayColor && (
          <span className="text-[10px] text-gray-500 font-mono">{displayColor}</span>
        )}
      </div>

      {/* Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute left-0 top-9 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-[232px]"
        >
          {/* Color grid */}
          <div className="grid grid-cols-8 gap-1 mb-2.5">
            {COLOR_GRID.flat().map((color, i) => (
              <button
                key={`${color}-${i}`}
                type="button"
                onClick={() => selectColor(color)}
                className={`w-6 h-6 rounded-sm border transition-transform hover:scale-110 ${
                  value === color
                    ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
                    : 'border-gray-200'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* None + Hex input row */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => selectColor('transparent')}
              className={`w-7 h-7 rounded border flex items-center justify-center flex-shrink-0 ${
                isNone
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              title="None"
            >
              <X size={12} className="text-gray-400" />
            </button>
            <div
              className="w-7 h-7 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: displayColor ?? '#ffffff' }}
            />
            <input
              type="text"
              value={hexInput.replace('#', '')}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              placeholder="000000"
              maxLength={7}
              className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400 font-mono w-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
