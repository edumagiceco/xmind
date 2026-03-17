import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useDocumentStore } from '../store/documentStore';
import {
  workbookToXMindContent,
  xmindContentToWorkbook,
  createXMindMetadata,
} from './xmindConverter';

let currentFilePath: string | null = null;

export function getCurrentFilePath() {
  return currentFilePath;
}

export async function saveFile(saveAs = false) {
  const workbook = useDocumentStore.getState().workbook;

  let path = currentFilePath;

  if (!path || saveAs) {
    const selected = await save({
      filters: [{ name: 'XMind Files', extensions: ['xmind'] }],
      defaultPath: currentFilePath || 'mindmap.xmind',
    });
    if (!selected) return; // user cancelled
    path = selected;
  }

  const content = workbookToXMindContent(workbook);
  const metadata = createXMindMetadata();

  await invoke('save_file', {
    path,
    content,
    metadata,
  });

  currentFilePath = path;
  useDocumentStore.getState().markSaved();
}

export async function openFile() {
  const selected = await open({
    filters: [{ name: 'XMind Files', extensions: ['xmind'] }],
    multiple: false,
  });

  if (!selected) return; // user cancelled

  const path = typeof selected === 'string' ? selected : (selected as unknown as string);

  console.log('[MindForge] Opening file:', path);

  try {
    const content = await invoke('open_file', { path });
    console.log('[MindForge] File content loaded, type:', Array.isArray(content) ? 'array' : typeof content);
    const workbook = xmindContentToWorkbook(content);
    console.log('[MindForge] Workbook created, sheets:', workbook.sheets.length);
    useDocumentStore.getState().setWorkbook(workbook);
    currentFilePath = path;
  } catch (e) {
    console.error('[MindForge] Open file error:', e);
    throw e;
  }
}

export function newFile() {
  useDocumentStore.getState().newWorkbook();
  currentFilePath = null;
}
