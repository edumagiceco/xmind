import type { ImageAttachment } from '../model/types';

const MAX_DIMENSION = 800;

/**
 * Resize an image to fit within MAX_DIMENSION, returning a base64 data URL.
 */
function resizeImage(img: HTMLImageElement): { src: string; width: number; height: number } {
  let { naturalWidth: w, naturalHeight: h } = img;

  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  return { src: canvas.toDataURL('image/png'), width: w, height: h };
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Read an image from the system clipboard. Returns null if no image found.
 */
export async function pasteImageFromClipboard(): Promise<ImageAttachment | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith('image/'));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      const img = await loadImageElement(dataUrl);
      return resizeImage(img);
    }
  } catch {
    // Clipboard API not available or no permission
  }
  return null;
}

/**
 * Pick an image via file input (works in both Tauri webview and browser).
 */
export async function pickImage(): Promise<ImageAttachment | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }

      try {
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });

        const img = await loadImageElement(dataUrl);
        const resized = resizeImage(img);
        resolve(resized);
      } catch {
        resolve(null);
      }
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
}
