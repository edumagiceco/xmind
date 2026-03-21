# Magic Mind 아키텍처

> 최종 갱신: 2026-03-19 | Phase 2 (성능 최적화) 반영

## 시스템 구조

```
Tauri 2.0 Shell
├── WebView (macOS: WebKit / Windows: WebView2)
│   └── React 19 + TypeScript + Vite
│       ├── HTML5 Canvas (렌더링 엔진)
│       │   ├── CanvasRenderer — 더티 플래그 + 뷰포트 컬링
│       │   ├── Camera — pan/zoom 좌표 변환
│       │   └── Quadtree — O(log n) 공간 인덱싱
│       ├── Zustand + immer + zundo (상태관리)
│       ├── Layout Engine (4 알고리즘 + 높이 메모이제이션)
│       └── React ErrorBoundary (크래시 복구)
└── Rust Backend (src-tauri)
    ├── 파일 I/O (ZIP/JSON)
    ├── 내보내기/가져오기 엔진
    └── 네이티브 메뉴, 다이얼로그
```

## 기술 스택

| 영역 | 선택 |
|------|------|
| 앱 프레임워크 | Tauri 2.0 |
| 프론트엔드 | React 19 + TypeScript + Vite |
| 렌더링 | HTML5 Canvas (커스텀) |
| 상태관리 | Zustand + immer + zundo |
| 공간 인덱싱 | Quadtree (히트 테스트) |
| CSS | Tailwind CSS |
| 백엔드 | Rust |
| 파일 포맷 | ZIP + content.json (.xmind 호환) |

## 렌더링 엔진

- `CanvasRenderer`: requestAnimationFrame 루프, 더티 플래그 기반 최적화
- `Camera`: pan/zoom, 스크린↔월드 좌표 변환
- `Quadtree`: 공간 인덱싱을 통한 O(log n) 히트 테스트 (Phase 2)
- **뷰포트 컬링**: 화면 밖 노드 렌더링 건너뛰기로 대규모 맵 성능 향상 (Phase 2)
- 레이어 기반 렌더링: 연결선 → 노드 → 선택 하이라이트 → 드래그 프리뷰 순서

## 레이아웃 엔진

- 4가지 구조 알고리즘을 `LayoutEngine`에서 디스패치
- 구현 완료: Mind Map, Logic Chart, Org Chart, Tree Chart
- 각 알고리즘은 `Topic` 트리를 입력받아 `LayoutResult` (위치가 계산된 `LayoutNode` 트리) 반환
- **높이 메모이제이션**: `heightCache` 맵으로 서브트리 높이 중복 계산 제거 (Phase 2)

## 상태관리

- `documentStore`: 워크북/토픽 CRUD, undo/redo (immer 기반 불변 갱신)
- `uiStore`: 선택, 편집, 뷰 상태
- `useTopicActions` 훅: 액션 함수를 getState()로 참조해 리렌더 방지 (Phase 2)
- `findTopicById`: 공유 유틸리티로 중복 코드 제거 (`src/utils/topicLookup.ts`)

## 보안

- `sanitizeColor()`: CSS 색상값 검증 (XSS 방지, Phase 1)
- `sanitizeSvgAttr()`: SVG 속성 입력값 검증 (Phase 1)
- React `ErrorBoundary`: 런타임 오류 시 앱 크래시 대신 복구 UI 표시 (Phase 1)

## IPC 통신

- 프론트엔드: `@tauri-apps/api`의 `invoke()` 호출
- 백엔드: `#[tauri::command]` 매크로로 핸들러 등록
- 커맨드: `save_file`, `open_file`, `new_file_path`

## 성능 최적화 이력

| Phase | 항목 | 전 | 후 |
|-------|------|----|----|
| 1 | 상태 업데이트 | JSON.parse 전체복사 | immer 구조적 공유 |
| 2 | 히트 테스트 | O(n) 트리 순회 | O(log n) Quadtree |
| 2 | 레이아웃 계산 | O(2^d) 중복 호출 | O(n) 메모이제이션 |
| 2 | OutlinerItem 렌더 | 12 selector/노드 | React.memo + 훅 |
| 2 | Canvas 렌더링 | 전체 노드 렌더 | 뷰포트 컬링 |
