# Magic Mind 테스트 전략

## 테스트 레벨

| 레벨 | 도구 | 대상 |
|------|------|------|
| Unit | Vitest | 레이아웃 알고리즘, 데이터 모델, 스토어 |
| Rust Unit | `cargo test` | ZIP 처리, 내보내기/가져오기 |
| Integration | Vitest + Tauri IPC | IPC 핸들러, 파이프라인 |
| E2E | Playwright | 핵심 워크플로, 성능 |
| CI | GitHub Actions | 전체 파이프라인 |

## 핵심 테스트 케이스

### 레이아웃 알고리즘
- 빈 맵 (루트만): 루트 중앙 배치 확인
- 대칭 트리: 좌/우 균등 분배 확인
- 비대칭 트리: 서브트리 높이 기반 오프셋 확인
- 접힌 노드: 자식 렌더링 생략 확인
- 1000+ 노드: 레이아웃 시간 < 100ms 확인

### 데이터 모델
- Topic CRUD: 추가/수정/삭제/이동
- Undo/Redo: 모든 연산에 대해 복원 확인
- 직렬화 왕복: JSON → Workbook → JSON 동일성

### 파일 I/O
- 저장/불러오기 왕복: 데이터 무결성 확인
- 대용량 파일 (1000 노드): 저장/로드 시간 확인
- 호환성: XMind 실제 파일 파싱 가능 여부

### UI / 인터랙션
- 클릭 선택, 다중 선택 (Cmd+클릭)
- 더블클릭 인라인 편집
- Tab (자식 추가), Enter (형제 추가), Delete (삭제)
- Pan (드래그), Zoom (스크롤/핀치)
- Cmd+Z (undo), Cmd+Shift+Z (redo)
