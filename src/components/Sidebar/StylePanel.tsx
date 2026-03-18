import { useUIStore } from '../../store/uiStore';
import { useDocumentStore } from '../../store/documentStore';
import type { Topic, TopicStyle, BorderStyle } from '../../model/types';
import { ShapeSelector } from './controls/ShapeSelector';
import { ColorPicker } from './controls/ColorPicker';
import { FontControls } from './controls/FontControls';
import { LineStylePicker } from './controls/LineStylePicker';
import { MarkerPicker } from './controls/MarkerPicker';

function findTopicById(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const child of root.children.attached) {
    const found = findTopicById(child, id);
    if (found) return found;
  }
  for (const child of root.children.detached) {
    const found = findTopicById(child, id);
    if (found) return found;
  }
  return null;
}

const BORDER_STYLES: { key: BorderStyle; label: string }[] = [
  { key: 'solid', label: 'Solid' },
  { key: 'dashed', label: 'Dashed' },
  { key: 'dotted', label: 'Dotted' },
  { key: 'none', label: 'None' },
];

const BORDER_WIDTHS = [0.5, 1, 1.5, 2, 3];

export function StylePanel() {
  const selectedTopicIds = useUIStore((s) => s.selectedTopicIds);
  const rootTopic = useDocumentStore((s) => s.getRootTopic());
  const updateTopicStyle = useDocumentStore((s) => s.updateTopicStyle);
  const toggleMarker = useDocumentStore((s) => s.toggleMarker);
  const updateTopicHyperlink = useDocumentStore((s) => s.updateTopicHyperlink);

  const topicId = selectedTopicIds[0];
  const topic = topicId ? findTopicById(rootTopic, topicId) : null;

  if (!topic) {
    return (
      <div className="text-sm text-gray-400 text-center mt-8 px-4">
        토픽을 선택하면 스타일을 편집할 수 있습니다.
      </div>
    );
  }

  const style = topic.style ?? {};
  const update = (partial: Partial<TopicStyle>) => updateTopicStyle(topic.id, partial);

  return (
    <div>
      <Section title="Shape">
        <ShapeSelector value={style.shape} onChange={(shape) => update({ shape })} />
      </Section>

      <Section title="Fill Color">
        <ColorPicker value={style.fillColor} onChange={(fillColor) => update({ fillColor })} />
      </Section>

      <Section title="Border">
        <div className="space-y-2.5">
          <ColorPicker
            value={style.borderColor}
            onChange={(borderColor) => update({ borderColor })}
            label="Color"
          />
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Style</p>
            <div className="flex gap-1.5">
              {BORDER_STYLES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ borderStyle: key })}
                  className={`flex-1 text-[10px] py-1.5 rounded border ${
                    style.borderStyle === key
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Width</p>
            <div className="flex gap-1.5">
              {BORDER_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => update({ borderWidth: w })}
                  className={`flex-1 text-[10px] py-1.5 rounded border ${
                    style.borderWidth === w
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Text">
        <FontControls style={style} onChange={update} />
      </Section>

      <Section title="Branch Line">
        <LineStylePicker
          lineStyle={style.lineStyle}
          lineWidth={style.lineWidth}
          lineColor={style.lineColor}
          onChange={update}
        />
      </Section>

      <Section title="Markers">
        <MarkerPicker
          markers={topic.markers}
          onToggle={(groupId, markerId) => toggleMarker(topic.id, groupId, markerId)}
        />
      </Section>

      <Section title="Hyperlink">
        <div className="flex gap-1">
          <input
            type="url"
            placeholder="https://..."
            value={topic.hyperlink ?? ''}
            onChange={(e) => updateTopicHyperlink(topic.id, e.target.value || undefined)}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:border-blue-400 focus:outline-none bg-white min-w-0"
          />
          {topic.hyperlink && (
            <a
              href={topic.hyperlink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              열기
            </a>
          )}
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
