# MindForge 코드 품질 개선 프로젝트 계획

> 바이브코딩으로 구축된 MVP를 프로덕션 품질로 끌어올리기 위한 단계별 리팩토링 계획

---

## 1. 현황 진단 요약

### 아키텍처 품질 점수 (현재)

| 항목 | 현재 점수 | 목표 점수 | 갭 |
|------|-----------|-----------|-----|
| 기능 완성도 | 8/10 | 9/10 | 작음 |
| 코드 구조 | 5/10 | 8/10 | 큼 |
| 성능 | 4/10 | 8/10 | 큼 |
| 타입 안전성 | 6/10 | 9/10 | 중간 |
| 에러 처리 | 3/10 | 8/10 | 큼 |
| 테스트 | 0/10 | 7/10 | 매우 큼 |
| 보안 | 4/10 | 8/10 | 큼 |
| 유지보수성 | 5/10 | 8/10 | 큼 |
| **종합** | **4.4/10** | **8.1/10** | |

### 핵심 문제 TOP 5

1. **JSON.parse/stringify 전체 복사** — 모든 상태 변경마다 O(n) 직렬화
2. **테스트 코드 0건** — 리팩토링 안전망 부재
3. **O(n) 히트 테스트** — 매 마우스 이동마다 전체 트리 순회
4. **God Object Store** — 27개 메서드가 단일 스토어에 집중
5. **SVG XSS + 입력 검증 부재** — 보안 취약점

### 리라이트 vs 리팩토링 판단

| 기준 | 리라이트 | 리팩토링 (선택) |
|------|----------|----------------|
| 기술 스택 | React+Zustand+Canvas+Tauri 유지 | 동일 (변경 불필요) |
| 기간 | 2-3개월 | 2-3주 (3 Phase) |
| 위험도 | 높음 (기능 누락, 재구현 비용) | 낮음 (점진적) |
| XMind 파서 | 재구현 필요 | 그대로 사용 |
| 레이아웃 4종 | 재구현 필요 | 그대로 사용 |
| 결론 | **부적합** — 아키텍처는 건전함 | **적합** — 구현 품질 개선에 집중 |

---

## 2. Phase 1: 긴급 안정화 (1-2일)

> 목표: 크래시 방지, 보안 취약점 제거, 성능 병목 1순위 해결

### 2.1 immer 도입 — cloneDeep 교체

**현재 문제:**
```typescript
// 24개 액션 모두에서 호출 — 1000노드 맵에서 타이핑 지연 발생
function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));  // 전체 워크북 직렬화
}
```

**개선 방향:**
```typescript
import { produce } from 'immer';

// Before (현재): 전체 복사 후 수정
updateTopicTitle: (topicId, title) =>
  set((state) => {
    const workbook = cloneDeep(state.workbook);  // 전체 복사
    // ... 수정
    return { workbook, isDirty: true };
  }),

// After (개선): 변경된 브랜치만 새 객체 생성
updateTopicTitle: (topicId, title) =>
  set((state) => ({
    workbook: produce(state.workbook, (draft) => {
      const sheet = draft.sheets.find(s => s.id === state.activeSheetId)!;
      const topic = findTopicMutable(sheet.rootTopic, topicId);
      if (topic) topic.title = title;
      draft.metadata.modifiedAt = new Date().toISOString();
    }),
    isDirty: true,
  })),
```

**수정 파일:** `src/store/documentStore.ts`
**영향 범위:** 24개 store 액션 전부
**예상 효과:** 상태 변경 성능 5-10x 향상, Undo 메모리 50% 절감
**사이드이펙트 위험:** 중간 — 테스트 없이 진행하므로 각 액션별 수동 검증 필요

### 2.2 SVG/PDF 내보내기 입력 검증

**현재 문제:**
```typescript
// 사용자 입력 색상이 SVG 속성에 직접 삽입 — XSS 가능
parts.push(`<path stroke="${lineColor}" ...`);

// hexToRgb가 잘못된 입력에 NaN 반환 — PDF 렌더링 깨짐
function hexToRgb(hex: string): [number, number, number] { ... }
```

**개선 방향:**
```typescript
// 색상 값 검증 유틸리티
function sanitizeColor(color: string, fallback = '#000000'): string {
  return /^#[0-9a-fA-F]{3,6}$/.test(color) ? color : fallback;
}

// 숫자 값 검증
function sanitizeNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
```

**수정 파일:** `src/services/exportService.ts`
**영향 범위:** PNG/SVG/PDF 내보내기
**예상 효과:** XSS 차단, NaN 크래시 방지
**사이드이펙트 위험:** 낮음 — fallback 값 사용으로 기존 동작 유지

### 2.3 React Error Boundary 추가

**현재 문제:**
```typescript
// 렌더링 에러 시 전체 앱이 흰 화면으로 크래시
// 에러 복구 메커니즘 없음
```

**개선 방향:**
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

**수정 파일:** 신규 `src/components/ErrorBoundary.tsx`, `src/App.tsx`
**영향 범위:** 전체 앱
**예상 효과:** 앱 크래시 시 복구 가능한 에러 화면 표시
**사이드이펙트 위험:** 없음 — 기존 코드를 감싸기만 함

### Phase 1 완료 기준
- [ ] immer로 24개 액션 전환 완료
- [ ] 모든 내보내기 형식 정상 동작 수동 확인
- [ ] Error Boundary 동작 확인 (의도적 에러 주입 테스트)
- [ ] 기존 기능 회귀 없음 수동 확인

---

## 3. Phase 2: 성능 최적화 (3-5일)

> 목표: 500-1000노드 맵에서 60fps 유지, 코드 구조 개선

### 3.1 Store 3분할

**현재 구조:**
```
documentStore.ts (27개 메서드, ~520줄)
└── 워크북 + 시트 + 토픽 + 스타일 + 관계선 + 마커 + 메모 + 링크
```

**개선 구조:**
```
stores/
├── workbookStore.ts      — Workbook/Sheet CRUD, 파일 경로, dirty 상태
├── topicStore.ts         — Topic CRUD, 이동, 접기, 메모, 마커, 링크
├── styleStore.ts         — TopicStyle, MapSettings, Theme, Structure
└── index.ts              — 통합 export + temporal 설정
```

**분리 원칙:**
- 각 스토어는 한 가지 도메인만 담당
- 스토어 간 참조는 `getState()`로 (순환 의존 방지)
- temporal(undo/redo)는 topicStore에만 적용 (스타일 변경은 undo 불필요할 수 있음)

**수정 파일:** `src/store/documentStore.ts` → 4개 파일로 분할
**영향 범위:** 모든 컴포넌트의 store import 경로 변경
**사이드이펙트 위험:** 높음 — 모든 import를 업데이트해야 하므로 테스트 필수

### 3.2 Quadtree 히트 테스트

**현재 문제:**
```typescript
// O(n) — 매 mousemove마다 전체 노드 탐색
hitTest(worldX, worldY) → hitTestNode(root, wx, wy) → 재귀 O(n)
```

**개선 방향:**
```typescript
// src/canvas/Quadtree.ts
class Quadtree {
  private bounds: Rect;
  private nodes: LayoutNode[] = [];
  private children: Quadtree[] | null = null;
  private maxNodes = 8;
  private maxDepth = 6;

  insert(node: LayoutNode): void { ... }
  query(point: Point): LayoutNode | null { ... }  // O(log n)
}

// CanvasRenderer에서 레이아웃 변경 시 Quadtree 재구성
setLayout(layout: LayoutResult) {
  this.layout = layout;
  this.quadtree = new Quadtree(this.getMapBounds());
  layout.nodes.forEach(node => this.quadtree.insert(node));
}
```

**수정 파일:** 신규 `src/canvas/Quadtree.ts`, `src/canvas/CanvasRenderer.ts`
**영향 범위:** hitTest, hitTestCollapse, hitTestAddButton, findDropTarget
**예상 효과:** 히트 테스트 O(n) → O(log n), 1000노드에서 60fps 유지
**사이드이펙트 위험:** 낮음 — 기존 hitTest의 반환값 인터페이스 동일

### 3.3 레이아웃 높이 메모이제이션

**현재 문제:**
```typescript
// getSubtreeHeight()가 같은 노드에 대해 여러 번 재귀 호출
// 균형 트리에서 O(2^depth) 복잡도
```

**개선 방향:**
```typescript
// 레이아웃 패스 시작 시 Map<string, number>으로 높이 캐싱
const heightCache = new Map<string, number>();

function getSubtreeHeight(node: LayoutNode): number {
  if (heightCache.has(node.id)) return heightCache.get(node.id)!;
  const height = /* ... 계산 ... */;
  heightCache.set(node.id, height);
  return height;
}
```

**수정 파일:** `src/layout/algorithms/MindMapLayout.ts` 및 기타 레이아웃
**영향 범위:** 레이아웃 계산
**예상 효과:** 레이아웃 계산 O(2^d) → O(n) 보장
**사이드이펙트 위험:** 낮음 — 순수 최적화, 결과값 동일

### 3.4 OutlinerItem 렌더 최적화

**현재 문제:**
```typescript
// 12개 store selector를 각 OutlinerItem마다 개별 호출
// 1000노드 = 12,000 selector 호출/렌더
```

**개선 방향:**
```typescript
// 커스텀 훅으로 액션 묶기
function useTopicActions() {
  return useDocumentStore(
    useShallow((s) => ({
      addChild: s.addChildTopic,
      addSibling: s.addSiblingTopic,
      delete: s.deleteTopic,
      updateTitle: s.updateTopicTitle,
      toggleCollapse: s.toggleCollapse,
      moveUp: s.moveTopicUp,
      moveDown: s.moveTopicDown,
      promote: s.promoteTopic,
      demote: s.demoteTopic,
    }))
  );
}

// React.memo로 불필요한 리렌더 방지
export const OutlinerItem = React.memo(function OutlinerItem({ ... }) {
  const actions = useTopicActions();
  // ...
});
```

**수정 파일:** `src/components/Outliner/OutlinerItem.tsx`, 신규 `src/hooks/useTopicActions.ts`
**영향 범위:** 아웃라이너 뷰
**예상 효과:** 아웃라이너 렌더 성능 50-70% 개선
**사이드이펙트 위험:** 낮음 — memo 추가는 기존 동작에 영향 없음

### 3.5 Topic ID Lookup Map

**현재 문제:**
```typescript
// findTopicById() — StylePanel, NotesPanel 등에서 매 렌더마다 O(n) 트리 검색
function findTopicById(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const child of root.children.attached) { ... } // O(n)
}
```

**개선 방향:**
```typescript
// documentStore에 ID → Topic 룩업 맵 유지
interface DocumentState {
  topicMap: Map<string, Topic>;  // 추가
  // ...
}

// 워크북 변경 시 맵 자동 재구성
function rebuildTopicMap(root: Topic): Map<string, Topic> {
  const map = new Map();
  const traverse = (t: Topic) => { map.set(t.id, t); t.children.attached.forEach(traverse); };
  traverse(root);
  return map;
}
```

**수정 파일:** `src/store/documentStore.ts`, StylePanel, NotesPanel 등
**영향 범위:** 토픽 검색이 필요한 모든 컴포넌트
**예상 효과:** 토픽 검색 O(n) → O(1)
**사이드이펙트 위험:** 중간 — 맵 동기화 누락 시 stale 데이터 위험

### Phase 2 완료 기준
- [ ] 1000노드 맵에서 마우스 호버 60fps 유지
- [ ] 아웃라이너 뷰 1000노드 스크롤 끊김 없음
- [ ] Store 분할 후 모든 기능 정상 동작
- [ ] 레이아웃 계산 500노드 기준 50ms 이내

---

## 4. Phase 3: 품질 보증 체계 구축 (1-2주)

> 목표: 테스트 커버리지 확보, 지속적 품질 관리 기반 마련

### 4.1 Vitest 단위 테스트

**테스트 대상 및 우선순위:**

```
tests/
├── store/
│   ├── topicStore.test.ts        — 토픽 CRUD (14 케이스)
│   │   ├── addChildTopic          — 자식 추가 + 부모 expanded 확인
│   │   ├── addSiblingTopic        — 형제 추가 + 인덱스 확인
│   │   ├── deleteTopic            — 삭제 + root 삭제 불가 확인
│   │   ├── moveTopic              — 이동 + 순환 참조 차단 확인
│   │   ├── moveTopicUp/Down       — 형제 순서 변경
│   │   ├── promoteTopic           — 상위 승격 + grandparent 없을 때 무시
│   │   ├── demoteTopic            — 하위 강등 + 첫 형제일 때 무시
│   │   ├── updateTopicNotes       — 메모 추가/삭제
│   │   ├── toggleMarker           — 같은 그룹 교체 확인
│   │   └── updateTopicHyperlink   — URL 설정/제거
│   ├── workbookStore.test.ts     — 시트 관리 (6 케이스)
│   │   ├── addSheet / removeSheet
│   │   ├── renameSheet
│   │   └── setActiveSheet
│   └── undoRedo.test.ts          — Undo/Redo (4 케이스)
├── layout/
│   ├── MindMapLayout.test.ts     — 레이아웃 계산 정확성 (6 케이스)
│   └── LayoutEngine.test.ts      — 구조 타입별 알고리즘 선택
├── services/
│   ├── exportService.test.ts     — 내보내기 출력 검증 (8 케이스)
│   │   ├── exportAsMarkdown       — 트리 → 마크다운 변환
│   │   ├── exportAsSvg            — SVG 구조 검증 + XSS 차단
│   │   └── sanitizeColor          — 색상 검증
│   └── xmindConverter.test.ts    — XMind 파일 파싱/생성
└── utils/
    └── geometry.test.ts          — 좌표 계산
```

**총 42개 테스트 케이스**, 핵심 비즈니스 로직 80% 커버리지 목표

**설정 파일:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
```

### 4.2 Playwright E2E 테스트

**핵심 워크플로우 테스트:**

```typescript
// tests/e2e/mindmap.spec.ts
test('기본 워크플로우', async ({ page }) => {
  // 1. 앱 로드 → 기본 맵 표시 확인
  // 2. 토픽 선택 → 사이드바 활성화 확인
  // 3. Tab 키 → 자식 토픽 추가 확인
  // 4. Enter 키 → 형제 토픽 추가 확인
  // 5. Delete → 토픽 삭제 확인
  // 6. ⌘Z → Undo 동작 확인
  // 7. 테마 변경 → 맵 리렌더 확인
  // 8. 구조 변경 → 레이아웃 변경 확인
  // 9. PNG 내보내기 → 파일 다운로드 확인
  // 10. Zen Mode → UI 숨김 확인
});

test('시트 관리', async ({ page }) => { ... });
test('검색 기능', async ({ page }) => { ... });
test('드래그앤드롭', async ({ page }) => { ... });
```

### 4.3 성능 벤치마크

```typescript
// tests/bench/performance.bench.ts
import { bench } from 'vitest';

bench('500노드 레이아웃 계산', () => {
  const root = generateLargeTree(500);
  computeLayout(root, 'mind-map', mockMeasure);
});

bench('1000노드 히트 테스트', () => {
  quadtree.query({ x: randomX, y: randomY });
});

bench('상태 업데이트 (immer)', () => {
  store.getState().updateTopicTitle(randomId, 'new title');
});
```

**성능 기준선:**
| 작업 | 최대 허용 시간 | 현재 예상 |
|------|---------------|-----------|
| 500노드 레이아웃 | 50ms | ~200ms (개선 전) |
| 히트 테스트 1회 | 1ms | ~5ms (개선 전) |
| 상태 업데이트 1회 | 5ms | ~20ms (개선 전) |
| 전체 렌더 1프레임 | 16ms (60fps) | ~30ms (개선 전) |

### 4.4 CI/CD 파이프라인 (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx vitest run            # 단위 테스트
      - run: npx tsc --noEmit          # 타입 체크
      - run: npx vite build            # 빌드 검증

  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test       # E2E 테스트
```

### Phase 3 완료 기준
- [ ] vitest 42개 테스트 케이스 전부 통과
- [ ] Playwright E2E 10개 워크플로우 통과
- [ ] 성능 벤치마크 기준선 달성
- [ ] GitHub Actions CI 파이프라인 동작

---

## 5. 리팩토링 원칙

### 점진적 리팩토링 규칙
1. **한 번에 하나의 변경만** — 여러 리팩토링을 동시에 하지 않음
2. **동작하는 코드 먼저 확보** — 변경 후 반드시 수동/자동 테스트
3. **인터페이스 유지** — 내부 구현만 변경, 외부 API는 최대한 유지
4. **커밋 단위 작게** — 문제 발생 시 쉽게 롤백 가능
5. **Phase 1에서 테스트 추가 후 Phase 2 진행** — 안전망 확보 우선

### 변경 금지 영역 (건드리지 않을 것)
- `src/services/xmindConverter.ts` — XMind 파일 호환은 정상 동작, 건드릴 이유 없음
- `src-tauri/` — Rust 백엔드는 단순하고 안정적
- `src/themes/defaultThemes.ts` — 테마 데이터는 정적

### 변경 주의 영역
- `src/layout/algorithms/*` — 레이아웃은 메모이제이션만 추가, 알고리즘 자체는 변경하지 않음
- `src/canvas/CanvasRenderer.ts` — 렌더링 파이프라인은 최적화만, 구조 변경 최소화

---

## 6. 일정 요약

```
Week 1: Phase 1 (긴급 안정화)
├── Day 1: immer 도입 + 24개 액션 전환
├── Day 2: 입력 검증 + Error Boundary + 수동 테스트
│
Week 1-2: Phase 2 (성능 최적화)
├── Day 3: Store 3분할
├── Day 4: Quadtree + 레이아웃 메모이제이션
├── Day 5: OutlinerItem 최적화 + Topic ID Map
│
Week 2-3: Phase 3 (품질 보증)
├── Day 6-7: Vitest 단위 테스트 42개
├── Day 8-9: Playwright E2E 테스트
└── Day 10: 벤치마크 + CI/CD
```

### 예상 결과

| 항목 | Before | After |
|------|--------|-------|
| 종합 점수 | 4.4/10 | 8.1/10 |
| 1000노드 상태 업데이트 | ~20ms | ~2ms |
| 히트 테스트 | O(n) | O(log n) |
| Undo 메모리 (100단계) | ~200MB | ~20MB |
| 테스트 커버리지 | 0% | 80% |
| SVG XSS | 취약 | 차단 |
| 앱 크래시 복구 | 불가 | Error Boundary |

---

## 7. 리스크 관리

### 리팩토링 중 예상 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| immer 전환 시 Undo 호환 깨짐 | 높음 | 높음 | Zundo + immer 공식 가이드 따름 |
| Store 분할 시 import 누락 | 중간 | 중간 | TypeScript가 컴파일 에러로 감지 |
| Quadtree 히트 미스 | 낮음 | 낮음 | 기존 O(n) 로직을 fallback으로 유지 |
| E2E 테스트 Flaky | 중간 | 낮음 | Retry + 안정적 selector 사용 |

### 중단 기준
- Phase 1 완료 후 기존 기능이 3개 이상 깨진 경우 → Phase 2 진입 전 안정화 우선
- Phase 2에서 성능이 오히려 저하된 경우 → 변경 롤백 후 원인 분석

---

*작성일: 2026-03-19 | MindForge v0.1.0 기준*
