# Magic Mind 레이아웃 알고리즘

## 개요

레이아웃 엔진은 `Topic` 트리를 입력받아 각 노드의 화면 좌표를 계산한다.

## 레이아웃 파이프라인

```
Topic Tree → 측정 패스 → 레이아웃 알고리즘 → 위치 할당 → 렌더
```

## Mind Map 레이아웃 (현재 구현)

### 알고리즘

1. **트리 빌드**: Topic 트리를 LayoutNode 트리로 변환, 텍스트 크기 측정
2. **좌/우 분할**: 자식 노드를 좌측/우측으로 균등 분배
3. **수직 트리 배치**: 각 쪽을 수직 트리로 배치
4. **서브트리 높이 계산**: 재귀적으로 서브트리 높이 합산
5. **위치 할당**: 루트 중심으로 좌/우 서브트리 배치

### 상수

- `HORIZONTAL_GAP`: 60px (부모-자식 간 수평 간격)
- `VERTICAL_GAP`: 16px (형제 간 수직 간격)
- `NODE_PADDING_X/Y`: 20px / 10px (노드 내부 패딩)
- `MIN_NODE_WIDTH/HEIGHT`: 60px / 30px

### 소스

- `src/layout/algorithms/MindMapLayout.ts`
- `src/layout/LayoutEngine.ts` (디스패처)

## 미구현 레이아웃 (Phase 2)

| 구조 | 알고리즘 | 연결선 |
|------|----------|--------|
| Logic Chart | 단방향 Tidy Tree (좌→우) | 직각 꺾임선 |
| Brace Map | Logic Chart + 중괄호 | 중괄호 + 직선 |
| Org Chart | 하향 Tidy Tree (상→하) | 수직+수평 직선 |
| Tree Chart | 인덴트 오프셋 트리 | 인덴트 선 |
| Timeline | 수평축 교대 배치 | 직선 |
| Fishbone | 45도 분기 | 대각선 |
| Tree Table | 트리 + 그리드 | 직선 + 그리드 |
| Matrix | 2D 그리드 | 그리드선 |
