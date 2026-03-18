import type { Marker } from '../../../model/types';
import { MARKER_GROUPS } from '../../../model/markers';

interface MarkerPickerProps {
  markers: Marker[];
  onToggle: (groupId: string, markerId: string) => void;
}

export function MarkerPicker({ markers, onToggle }: MarkerPickerProps) {
  const isActive = (groupId: string, markerId: string) =>
    markers.some((m) => m.groupId === groupId && m.markerId === markerId);

  return (
    <div className="space-y-3">
      {MARKER_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="text-[10px] text-gray-400 mb-1">{group.name}</p>
          <div className="flex flex-wrap gap-1">
            {group.markers.map((marker) => {
              const active = isActive(group.id, marker.id);
              return (
                <button
                  key={marker.id}
                  type="button"
                  title={marker.label}
                  onClick={() => onToggle(group.id, marker.id)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-all ${
                    active
                      ? 'bg-blue-100 ring-1 ring-blue-400 scale-110'
                      : 'hover:bg-gray-100 hover:scale-105'
                  }`}
                >
                  {marker.icon}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {markers.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1">적용됨</p>
          <div className="flex gap-1">
            {markers.map((m) => {
              const group = MARKER_GROUPS.find((g) => g.id === m.groupId);
              const marker = group?.markers.find((mk) => mk.id === m.markerId);
              if (!marker) return null;
              return (
                <button
                  key={`${m.groupId}-${m.markerId}`}
                  type="button"
                  title={`${marker.label} 제거`}
                  onClick={() => onToggle(m.groupId, m.markerId)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-sm"
                >
                  {marker.icon}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
