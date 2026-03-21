# MAX Mind 파일 포맷

## 개요

MAX Mind는 `.xmind` 확장자의 ZIP 아카이브를 파일 포맷으로 사용한다.
XMind Zen 포맷과 호환을 목표로 한다.

## ZIP 아카이브 구조

```
document.xmind (ZIP)
├── content.json          # Workbook 데이터 (JSON)
├── metadata.json         # 파일 메타데이터
├── Thumbnails/
│   └── thumbnail.png     # 256x256 미리보기
├── attachments/
│   ├── {uuid}.png        # 첨부 이미지
│   └── {uuid}.jpg
└── comments.json         # 토픽 코멘트 (선택)
```

## content.json 스키마

```json
{
  "id": "workbook-id",
  "sheets": [
    {
      "id": "sheet-id",
      "title": "Sheet 1",
      "structure": "mind-map",
      "theme": "default",
      "rootTopic": {
        "id": "topic-id",
        "title": "Central Topic",
        "children": {
          "attached": [...],
          "detached": []
        },
        "markers": [],
        "labels": []
      },
      "relationships": [],
      "boundaries": [],
      "summaries": []
    }
  ],
  "metadata": {
    "creator": "MAX Mind",
    "version": "1.0.0",
    "createdAt": "2026-03-17T00:00:00.000Z",
    "modifiedAt": "2026-03-17T00:00:00.000Z"
  }
}
```

## Rust 구현

- 읽기: `src-tauri/src/file_io.rs` → `open_file()`
- 쓰기: `src-tauri/src/file_io.rs` → `save_file()`
- 사용 크레이트: `zip` (ZIP 처리), `serde_json` (JSON)
