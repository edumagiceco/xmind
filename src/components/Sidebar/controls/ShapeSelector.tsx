import type { TopicShape } from '../../../model/types';

interface ShapeSelectorProps {
  value: TopicShape | undefined;
  onChange: (shape: TopicShape) => void;
}

const SHAPES: { key: TopicShape; label: string }[] = [
  { key: 'rounded-rect', label: 'Rounded' },
  { key: 'rect', label: 'Rectangle' },
  { key: 'ellipse', label: 'Ellipse' },
  { key: 'diamond', label: 'Diamond' },
  { key: 'underline', label: 'Underline' },
  { key: 'capsule', label: 'Capsule' },
  { key: 'parallelogram', label: 'Parallel' },
];

function ShapePreview({ shape }: { shape: TopicShape }) {
  const base = 'w-full h-full border-2 border-gray-400 dark:border-gray-500';

  switch (shape) {
    case 'rounded-rect':
      return <div className={`${base} rounded bg-white`} />;
    case 'rect':
      return <div className={`${base} rounded-none bg-white`} />;
    case 'ellipse':
      return <div className={`${base} rounded-full bg-white`} />;
    case 'diamond':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="w-[70%] h-[70%] border-2 border-gray-400 bg-white"
            style={{ transform: 'rotate(45deg)' }}
          />
        </div>
      );
    case 'underline':
      return (
        <div className="w-full h-full flex items-end">
          <div className="w-full border-b-2 border-gray-400 mb-1" />
        </div>
      );
    case 'capsule':
      return <div className={`${base} bg-white`} style={{ borderRadius: '999px' }} />;
    case 'parallelogram':
      return (
        <div
          className={`${base} rounded-sm bg-white`}
          style={{ transform: 'skewX(-10deg)' }}
        />
      );
  }
}

export function ShapeSelector({ value, onChange }: ShapeSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SHAPES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex flex-col items-center gap-1 p-1.5 rounded border ${
            value === key
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
          title={label}
        >
          <div className="w-10 h-6">
            <ShapePreview shape={key} />
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{label}</span>
        </button>
      ))}
    </div>
  );
}
