import { useDocumentStore } from '../../store/documentStore';
import type { StructureType } from '../../model/types';
import { getAllThemes } from '../../themes/ThemeEngine';
import { ColorPicker } from './controls/ColorPicker';

const STRUCTURES: { key: StructureType; label: string; implemented: boolean }[] = [
  { key: 'mind-map', label: 'Mind Map', implemented: true },
  { key: 'logic-chart', label: 'Logic Chart', implemented: true },
  { key: 'org-chart', label: 'Org Chart', implemented: true },
  { key: 'tree-chart', label: 'Tree Chart', implemented: true },
  { key: 'brace-map', label: 'Brace Map', implemented: false },
  { key: 'timeline', label: 'Timeline', implemented: false },
  { key: 'fishbone', label: 'Fishbone', implemented: false },
  { key: 'tree-table', label: 'Tree Table', implemented: false },
  { key: 'matrix', label: 'Matrix', implemented: false },
];

function StructureIcon({ type }: { type: StructureType }) {
  const stroke = 'currentColor';
  const fill = 'currentColor';
  switch (type) {
    case 'mind-map':
      return (
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
          <circle cx="12" cy="8" r="2" fill={fill} />
          <line x1="10" y1="8" x2="3" y2="4" stroke={stroke} strokeWidth="1.2" />
          <line x1="10" y1="8" x2="3" y2="12" stroke={stroke} strokeWidth="1.2" />
          <line x1="14" y1="8" x2="21" y2="4" stroke={stroke} strokeWidth="1.2" />
          <line x1="14" y1="8" x2="21" y2="12" stroke={stroke} strokeWidth="1.2" />
          <circle cx="3" cy="4" r="1.2" fill={fill} />
          <circle cx="3" cy="12" r="1.2" fill={fill} />
          <circle cx="21" cy="4" r="1.2" fill={fill} />
          <circle cx="21" cy="12" r="1.2" fill={fill} />
        </svg>
      );
    case 'logic-chart':
      return (
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
          <circle cx="4" cy="8" r="2" fill={fill} />
          <line x1="6" y1="8" x2="12" y2="3" stroke={stroke} strokeWidth="1.2" />
          <line x1="6" y1="8" x2="12" y2="8" stroke={stroke} strokeWidth="1.2" />
          <line x1="6" y1="8" x2="12" y2="13" stroke={stroke} strokeWidth="1.2" />
          <line x1="12" y1="3" x2="20" y2="3" stroke={stroke} strokeWidth="1.2" />
          <line x1="12" y1="8" x2="20" y2="8" stroke={stroke} strokeWidth="1.2" />
          <line x1="12" y1="13" x2="20" y2="13" stroke={stroke} strokeWidth="1.2" />
          <circle cx="20" cy="3" r="1.2" fill={fill} />
          <circle cx="20" cy="8" r="1.2" fill={fill} />
          <circle cx="20" cy="13" r="1.2" fill={fill} />
        </svg>
      );
    case 'org-chart':
      return (
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
          <circle cx="12" cy="3" r="2" fill={fill} />
          <line x1="12" y1="5" x2="12" y2="8" stroke={stroke} strokeWidth="1.2" />
          <line x1="5" y1="8" x2="19" y2="8" stroke={stroke} strokeWidth="1.2" />
          <line x1="5" y1="8" x2="5" y2="11" stroke={stroke} strokeWidth="1.2" />
          <line x1="12" y1="8" x2="12" y2="11" stroke={stroke} strokeWidth="1.2" />
          <line x1="19" y1="8" x2="19" y2="11" stroke={stroke} strokeWidth="1.2" />
          <circle cx="5" cy="12" r="1.2" fill={fill} />
          <circle cx="12" cy="12" r="1.2" fill={fill} />
          <circle cx="19" cy="12" r="1.2" fill={fill} />
        </svg>
      );
    case 'tree-chart':
      return (
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
          <circle cx="4" cy="3" r="1.5" fill={fill} />
          <line x1="5.5" y1="3" x2="8" y2="3" stroke={stroke} strokeWidth="1.2" />
          <line x1="8" y1="3" x2="8" y2="13" stroke={stroke} strokeWidth="1.2" />
          <line x1="8" y1="5" x2="12" y2="5" stroke={stroke} strokeWidth="1.2" />
          <line x1="8" y1="8" x2="12" y2="8" stroke={stroke} strokeWidth="1.2" />
          <line x1="8" y1="11" x2="12" y2="11" stroke={stroke} strokeWidth="1.2" />
          <circle cx="13" cy="5" r="1.2" fill={fill} />
          <circle cx="13" cy="8" r="1.2" fill={fill} />
          <circle cx="13" cy="11" r="1.2" fill={fill} />
        </svg>
      );
    default:
      return null;
  }
}

const LINE_WIDTHS = [1, 1.5, 2, 3];

export function MapPanel() {
  const sheet = useDocumentStore((s) => s.getActiveSheet());
  const setSheetStructure = useDocumentStore((s) => s.setSheetStructure);
  const setSheetTheme = useDocumentStore((s) => s.setSheetTheme);
  const updateMapSettings = useDocumentStore((s) => s.updateMapSettings);

  const mapSettings = sheet.mapSettings;
  const themes = getAllThemes();

  return (
    <div>
      <Section title="Structure">
        <div className="grid grid-cols-3 gap-1.5">
          {STRUCTURES.map(({ key, label, implemented }) => (
            <button
              key={key}
              type="button"
              onClick={implemented ? () => setSheetStructure(key) : undefined}
              className={`relative text-[10px] py-3 px-1 rounded border text-center flex flex-col items-center gap-1 ${
                !implemented
                  ? 'opacity-40 border-gray-200 text-gray-400 cursor-default'
                  : sheet.structure === key
                    ? 'border-blue-500 bg-blue-50 text-blue-600 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 cursor-pointer'
              }`}
              disabled={!implemented}
            >
              {implemented && <StructureIcon type={key} />}
              {label}
              {!implemented && (
                <span className="absolute top-0.5 right-0.5 text-[7px] bg-gray-200 text-gray-500 px-1 rounded-sm leading-tight">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Theme">
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSheetTheme(theme.id)}
              className={`p-2 rounded border text-left ${
                sheet.theme === theme.id
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1 mb-1.5">
                <div
                  className="w-5 h-5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: theme.centralTopic.fillColor }}
                  title="Central"
                />
                <div
                  className="w-5 h-5 rounded-full border border-gray-200"
                  style={{ backgroundColor: theme.mainTopic.fillColor }}
                  title="Main"
                />
                <div
                  className="w-5 h-5 rounded-full border border-gray-200"
                  style={{ backgroundColor: theme.subTopic.fillColor }}
                  title="Sub"
                />
              </div>
              <p className="text-[10px] text-gray-600 truncate">{theme.name}</p>
              <div
                className="mt-1 h-1 rounded-full"
                style={{ backgroundColor: theme.canvas.backgroundColor }}
              />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background">
        <ColorPicker
          value={mapSettings?.backgroundColor}
          onChange={(color) => updateMapSettings({ backgroundColor: color })}
        />
      </Section>

      <Section title="Colored Branches">
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            type="button"
            onClick={() => updateMapSettings({ coloredBranches: !(mapSettings?.coloredBranches !== false) })}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              mapSettings?.coloredBranches !== false ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                mapSettings?.coloredBranches !== false ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs text-gray-600">
            {mapSettings?.coloredBranches !== false ? 'On' : 'Off'}
          </span>
        </label>
      </Section>

      <Section title="Line Width">
        <div className="flex gap-1.5">
          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateMapSettings({ globalLineWidth: w })}
              className={`flex-1 flex items-center justify-center h-8 rounded border ${
                (mapSettings?.globalLineWidth ?? 2) === w
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
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}
