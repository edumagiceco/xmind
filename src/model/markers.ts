export interface MarkerDefinition {
  id: string;
  label: string;
  icon: string; // emoji
}

export interface MarkerGroup {
  id: string;
  name: string;
  markers: MarkerDefinition[];
}

export const MARKER_GROUPS: MarkerGroup[] = [
  {
    id: 'priority',
    name: '우선순위',
    markers: [
      { id: 'priority-1', label: '1순위', icon: '1️⃣' },
      { id: 'priority-2', label: '2순위', icon: '2️⃣' },
      { id: 'priority-3', label: '3순위', icon: '3️⃣' },
      { id: 'priority-4', label: '4순위', icon: '4️⃣' },
      { id: 'priority-5', label: '5순위', icon: '5️⃣' },
    ],
  },
  {
    id: 'progress',
    name: '진행 상태',
    markers: [
      { id: 'progress-start', label: '시작', icon: '🔵' },
      { id: 'progress-half', label: '진행중', icon: '🟡' },
      { id: 'progress-done', label: '완료', icon: '🟢' },
      { id: 'progress-pause', label: '보류', icon: '🔴' },
    ],
  },
  {
    id: 'flag',
    name: '플래그',
    markers: [
      { id: 'flag-red', label: '빨강', icon: '🚩' },
      { id: 'flag-orange', label: '주황', icon: '🔶' },
      { id: 'flag-green', label: '초록', icon: '✅' },
      { id: 'flag-blue', label: '파랑', icon: '🔷' },
      { id: 'flag-purple', label: '보라', icon: '💜' },
    ],
  },
  {
    id: 'symbol',
    name: '기호',
    markers: [
      { id: 'symbol-star', label: '별', icon: '⭐' },
      { id: 'symbol-heart', label: '하트', icon: '❤️' },
      { id: 'symbol-idea', label: '아이디어', icon: '💡' },
      { id: 'symbol-question', label: '질문', icon: '❓' },
      { id: 'symbol-warning', label: '경고', icon: '⚠️' },
      { id: 'symbol-check', label: '확인', icon: '✔️' },
      { id: 'symbol-cross', label: '취소', icon: '❌' },
      { id: 'symbol-fire', label: '중요', icon: '🔥' },
    ],
  },
];

export function getMarkerIcon(groupId: string, markerId: string): string | undefined {
  const group = MARKER_GROUPS.find((g) => g.id === groupId);
  if (!group) return undefined;
  const marker = group.markers.find((m) => m.id === markerId);
  return marker?.icon;
}

export function getMarkerLabel(groupId: string, markerId: string): string | undefined {
  const group = MARKER_GROUPS.find((g) => g.id === groupId);
  if (!group) return undefined;
  const marker = group.markers.find((m) => m.id === markerId);
  return marker?.label;
}
