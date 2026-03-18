# TOP 5 신규 기능 세부 개발 계획

## 개요

구현 난이도 대비 효과가 높은 5가지 기능의 세부 개발 계획입니다.

| 순위 | 기능 | 난이도 | 예상 효과 |
|------|------|--------|-----------|
| 1 | PNG/SVG 이미지 내보내기 | 낮음 | 높음 |
| 2 | Notes/메모 UI | 낮음 | 높음 |
| 3 | Zen Mode (집중 모드) | 낮음 | 중간 |
| 4 | Outliner View (아웃라이너 뷰) | 중간 | 높음 |
| 5 | Markers UI (마커/아이콘) | 낮음 | 중간 |

---

## Feature 1: PNG/SVG 이미지 내보내기

### 목표
현재 Canvas에 렌더링된 마인드맵을 PNG 또는 SVG 이미지 파일로 내보내기

### 구현 전략
- **PNG**: 오프스크린 Canvas를 생성하여 전체 맵 영역을 렌더링 후 `toDataURL()`로 변환
- **SVG**: 레이아웃 노드 트리를 순회하며 SVG 엘리먼트로 변환

### 수정/생성 파일
- `src/services/exportService.ts` (신규) - 내보내기 로직
- `src/components/Toolbar/MainToolbar.tsx` - 내보내기 버튼 추가

### 세부 구현 단계
1. **exportService.ts 생성**: `exportAsPng()`, `exportAsSvg()` 함수 구현
2. **PNG 내보내기**: LayoutResult에서 전체 바운딩 박스 계산 → 오프스크린 Canvas 생성 → 전체 맵 렌더링 → Blob으로 변환 → 다운로드
3. **SVG 내보내기**: 노드와 연결선을 SVG path/rect/text 엘리먼트로 변환
4. **Toolbar UI**: 내보내기 드롭다운 메뉴 추가 (PNG, SVG 선택)

### 기술 고려사항
- 전체 맵이 보이도록 바운딩 박스에 padding 추가
- Retina 디스플레이 대응 (2x 해상도 옵션)
- Tauri 환경에서는 네이티브 파일 저장 다이얼로그 사용
- 브라우저 환경에서는 `<a download>` 방식 사용

---

## Feature 2: Notes/메모 UI

### 목표
토픽에 텍스트 메모를 추가/편집/표시하는 UI 제공

### 현재 상태
- `Topic.notes?: RichTextBlock[]` 모델 이미 존재
- UI만 미구현 상태

### 구현 전략
- 사이드바에 Notes 탭 또는 StylePanel 하단에 메모 영역 추가
- 토픽 선택 시 해당 토픽의 메모를 편집 가능한 textarea로 표시
- 캔버스에서 메모가 있는 토픽에 작은 아이콘 표시

### 수정/생성 파일
- `src/store/documentStore.ts` - `updateTopicNotes()` 액션 추가
- `src/components/Sidebar/NotesPanel.tsx` (신규) - 메모 편집 패널
- `src/components/Sidebar/Sidebar.tsx` - Notes 탭 추가
- `src/canvas/CanvasRenderer.ts` - 메모 아이콘 렌더링
- `src/store/uiStore.ts` - sidebarTab 타입에 'notes' 추가

### 세부 구현 단계
1. **documentStore 확장**: `updateTopicNotes(topicId, text)` 추가 (plaintext → RichTextBlock 변환)
2. **NotesPanel 컴포넌트 생성**: textarea + 저장 로직
3. **Sidebar 탭 추가**: Style | Map | Notes 3개 탭
4. **Canvas 메모 아이콘**: 토픽 우측 상단에 작은 메모 아이콘 렌더링

---

## Feature 3: Zen Mode (집중 모드)

### 목표
전체화면에서 Toolbar/Sidebar를 숨기고 맵에만 집중할 수 있는 모드

### 구현 전략
- uiStore에 `isZenMode` 상태 추가
- Zen Mode 진입 시 Toolbar와 Sidebar를 숨기고 Canvas를 전체화면으로 확대
- ESC 키 또는 마우스 상단 이동 시 최소한의 컨트롤 표시

### 수정/생성 파일
- `src/store/uiStore.ts` - `isZenMode`, `toggleZenMode()` 추가
- `src/App.tsx` - Zen Mode 조건부 렌더링
- `src/components/ZenModeOverlay.tsx` (신규) - Zen Mode UI 오버레이
- `src/components/Toolbar/MainToolbar.tsx` - Zen Mode 진입 버튼

### 세부 구현 단계
1. **uiStore 확장**: `isZenMode` 상태 + `toggleZenMode()` 추가
2. **App.tsx 수정**: Zen Mode일 때 Toolbar/Sidebar 숨김, Canvas 전체화면
3. **ZenModeOverlay 생성**: 화면 상단 호버 시 나타나는 미니 컨트롤바 (종료 버튼, 줌 컨트롤)
4. **키보드 단축키**: `Cmd+Shift+F`로 Zen Mode 토글, ESC로 종료
5. **Toolbar 버튼**: Zen Mode 진입 아이콘 추가

---

## Feature 4: Outliner View (아웃라이너 뷰)

### 목표
마인드맵의 트리 구조를 텍스트 리스트 형태로 보고 편집할 수 있는 뷰

### 구현 전략
- 캔버스 위에 아웃라이너 뷰를 오버레이 또는 전환하는 방식
- 기존 Topic 트리 데이터를 재귀적으로 들여쓰기된 리스트로 렌더링
- 아웃라이너에서의 편집이 실시간으로 맵에 반영

### 수정/생성 파일
- `src/components/Outliner/OutlinerView.tsx` (신규) - 아웃라이너 뷰
- `src/components/Outliner/OutlinerItem.tsx` (신규) - 개별 토픽 행
- `src/store/uiStore.ts` - `viewMode: 'map' | 'outliner'` 추가
- `src/App.tsx` - 뷰 모드 전환 로직
- `src/components/Toolbar/MainToolbar.tsx` - 뷰 전환 버튼

### 세부 구현 단계
1. **uiStore 확장**: `viewMode` 상태 + `setViewMode()` 추가
2. **OutlinerItem 컴포넌트**: 토픽 1개를 표시 (들여쓰기 + 접기/펼치기 + 인라인 편집)
3. **OutlinerView 컴포넌트**: rootTopic 트리를 재귀적으로 OutlinerItem으로 렌더링
4. **App.tsx 수정**: viewMode에 따라 Canvas 또는 OutlinerView 표시
5. **Toolbar 버튼**: 맵/아웃라이너 뷰 전환 토글

### 기술 고려사항
- documentStore의 기존 액션 재사용 (addChild, addSibling, delete, updateTitle)
- 키보드 단축키 동일하게 지원 (Tab, Enter, Delete, 방향키)
- 선택 상태 공유 (아웃라이너에서 선택한 토픽이 맵에서도 선택됨)

---

## Feature 5: Markers UI (마커/아이콘)

### 목표
토픽에 시각적 마커(우선순위, 진행상태, 플래그 등)를 추가하는 UI

### 현재 상태
- `Topic.markers: Marker[]` 모델 이미 존재
- `Marker { groupId, markerId }` 인터페이스 정의됨
- UI와 렌더링만 미구현

### 구현 전략
- 마커 그룹 정의 (우선순위 1-5, 진행상태, 플래그 등)
- 사이드바 StylePanel에 마커 선택 섹션 추가
- 캔버스에서 토픽 옆에 마커 아이콘 렌더링

### 수정/생성 파일
- `src/model/markers.ts` (신규) - 마커 그룹/아이콘 정의
- `src/store/documentStore.ts` - `toggleMarker()` 액션 추가
- `src/components/Sidebar/controls/MarkerPicker.tsx` (신규) - 마커 선택 UI
- `src/components/Sidebar/StylePanel.tsx` - 마커 섹션 추가
- `src/canvas/CanvasRenderer.ts` - 마커 렌더링

### 세부 구현 단계
1. **markers.ts 생성**: 마커 그룹과 마커 정의 (이모지/텍스트 기반)
2. **documentStore 확장**: `toggleMarker(topicId, groupId, markerId)` 추가
3. **MarkerPicker 컴포넌트**: 마커 그룹별 선택 그리드 UI
4. **StylePanel 통합**: 마커 섹션 추가
5. **Canvas 렌더링**: 토픽 좌측에 마커 아이콘 표시, 레이아웃에 마커 너비 반영

---

## 구현 순서 및 의존성

```
Feature 1 (PNG/SVG 내보내기)  → 독립적, 즉시 구현 가능
Feature 2 (Notes UI)          → 독립적, 즉시 구현 가능
Feature 3 (Zen Mode)          → 독립적, 즉시 구현 가능
Feature 4 (Outliner View)     → 독립적, 즉시 구현 가능
Feature 5 (Markers UI)        → 독립적, 즉시 구현 가능
```

모든 기능이 독립적이므로 순서대로 구현합니다.
