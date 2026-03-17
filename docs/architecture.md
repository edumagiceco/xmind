# MindForge 아키텍처

## 시스템 구조

```
Tauri 2.0 Shell
├── WebView (macOS: WebKit / Windows: WebView2)
│   └── React 19 + TypeScript + Vite
│       ├── HTML5 Canvas (렌더링 엔진)
│       ├── Zustand + zundo (상태관리)
│       └── Layout Engine (TypeScript)
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
| 상태관리 | Zustand + zundo |
| CSS | Tailwind CSS |
| 백엔드 | Rust |
| 파일 포맷 | ZIP + content.json (.xmind 호환) |

## 렌더링 엔진

- `CanvasRenderer`: requestAnimationFrame 루프, 더티 플래그 기반 최적화
- `Camera`: pan/zoom, 스크린↔월드 좌표 변환
- 레이어 기반 렌더링: 연결선 → 노드 → 선택 하이라이트 순서

## 레이아웃 엔진

- 9가지 구조 알고리즘을 `LayoutEngine`에서 디스패치
- 현재 구현: Mind Map (양방향 Tidy Tree)
- 각 알고리즘은 `Topic` 트리를 입력받아 `LayoutResult` (위치가 계산된 `LayoutNode` 트리) 반환

## IPC 통신

- 프론트엔드: `@tauri-apps/api`의 `invoke()` 호출
- 백엔드: `#[tauri::command]` 매크로로 핸들러 등록
- 현재 커맨드: `save_file`, `open_file`, `new_file_path`
