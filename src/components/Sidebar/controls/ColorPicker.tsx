import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const PRESET_COLORS = [
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
  '#333333', '#ffffff', '#f5f5f5', '#ff6b6b', '#ffd93d', '#6bcb77',
];

interface ColorPickerProps {
  value: string | undefined;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value ?? '');

  useEffect(() => {
    setHexInput(value ?? '');
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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

  return (
    <div className="w-[200px]">
      {label && (
        <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      )}

      {/* Preset swatches - 6x2 grid + none option */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {/* None / transparent option */}
        <button
          type="button"
          onClick={() => onChange('transparent')}
          className={`w-6 h-6 rounded border flex items-center justify-center ${
            value === 'transparent'
              ? 'border-blue-500 ring-1 ring-blue-500'
              : 'border-gray-300'
          }`}
          title="None"
        >
          <X size={10} className="text-gray-400" />
        </button>

        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-6 h-6 rounded border relative ${
              value === color
                ? 'border-blue-500 ring-1 ring-blue-500'
                : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          >
            {value === color && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                style={{
                  color: isLightColor(color) ? '#333' : '#fff',
                }}
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Hex input */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
          style={{ backgroundColor: value || 'transparent' }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          placeholder="#000000"
          className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400"
        />
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 186;
}
