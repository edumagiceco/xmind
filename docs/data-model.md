# Magic Mind 데이터 모델

## 핵심 타입 계층

```
Workbook
├── metadata: WorkbookMetadata
└── sheets: Sheet[]
    ├── rootTopic: Topic (트리 구조)
    ├── relationships: Relationship[]
    ├── boundaries: Boundary[]
    ├── summaries: Summary[]
    ├── theme: string
    └── structure: StructureType
```

## Topic (노드)

```typescript
interface Topic {
  id: string;
  title: string;
  children: { attached: Topic[], detached: Topic[] };
  markers: Marker[];
  labels: string[];
  notes?: RichTextBlock[];
  image?: ImageAttachment;
  hyperlink?: string;
  style?: TopicStyle;
  collapsed?: boolean;
  branchDirection?: 'left' | 'right' | 'auto';
}
```

## 9가지 구조 타입

- `mind-map`: 양방향 방사형
- `logic-chart`: 좌→우 로직 차트
- `brace-map`: 중괄호 맵
- `org-chart`: 상→하 조직도
- `tree-chart`: 파일 트리 형태
- `timeline`: 타임라인
- `fishbone`: 어골도
- `tree-table`: 트리 + 테이블 하이브리드
- `matrix`: 2D 매트릭스

## 파일 포맷

`.xmind` 파일은 ZIP 아카이브:

```
document.xmind
├── content.json    # Workbook JSON
├── metadata.json   # 메타데이터
├── Thumbnails/     # 썸네일
└── attachments/    # 첨부 이미지
```

## 소스 파일

- 타입 정의: `src/model/types.ts`
- 문서 스토어: `src/store/documentStore.ts`
- UI 스토어: `src/store/uiStore.ts`
