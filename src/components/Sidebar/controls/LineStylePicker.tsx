import type { LineStyle, TopicStyle } from '../../../model/types';
import { ColorPicker } from './ColorPicker';

interface LineStylePickerProps {
  lineStyle?: LineStyle;
  lineWidth?: number;
  lineColor?: string;
  onChange: (updates: Partial<TopicStyle>) => void;
}

const LINE_STYLES: { key: LineStyle; label: string }[] = [
  { key: 'curved', label: 'Curved' },
  { key: 'straight', label: 'Straight' },
  { key: 'angular', label: 'Angular' },
  { key: 'elbow', label: 'Elbow' },
];

const LINE_WIDTHS = [1, 1.5, 2, 3];

function LineStyleIcon({ style }: { style: LineStyle }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" className="text-gray-600">
      {style === 'curved' && (
        <path d="M2 14 C10 14, 18 2, 26 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
      {style === 'straight' && (
        <line x1="2" y1="14" x2="26" y2="2" stroke="currentColor" strokeWidth="1.5" />
      )}
      {style === 'angular' && (
        <polyline points="2,14 14,2 26,14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
      {style === 'elbow' && (
        <polyline points="2,14 2,2 26,2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

export function LineStylePicker({
  lineStyle,
  lineWidth,
  lineColor,
  onChange,
}: LineStylePickerProps) {
  return (
    <div className="space-y-2.5">
      {/* Line style buttons */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Style</p>
        <div className="flex gap-1.5">
          {LINE_STYLES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ lineStyle: key })}
              className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded border ${
                lineStyle === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              title={label}
            >
              <LineStyleIcon style={key} />
              <span className="text-[9px] text-gray-500">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line width buttons */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Width</p>
        <div className="flex gap-1.5">
          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onChange({ lineWidth: w })}
              className={`flex-1 flex items-center justify-center h-8 rounded border ${
                lineWidth === w
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              title={`${w}px`}
            >
              <div
                className="w-5 rounded-full bg-gray-600"
                style={{ height: `${w}px` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Line color */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Color</p>
        <ColorPicker
          value={lineColor}
          onChange={(color) => onChange({ lineColor: color })}
        />
      </div>
    </div>
  );
}
