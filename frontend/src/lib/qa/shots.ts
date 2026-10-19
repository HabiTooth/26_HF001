const DB = 'habitooth.qa';
const STORE = 'shots';
const MAX_WIDTH = 720;
const QUALITY = 0.72;

export interface Shot {
  id: string;
  screenId: string;
  dataUrl: string;
  takenAt: string;
  note: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('screenId', 'screenId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const listShots = () => tx<Shot[]>('readonly', (s) => s.getAll());
export const putShot = (shot: Shot) => tx('readwrite', (s) => s.put(shot));
export const deleteShot = (id: string) => tx('readwrite', (s) => s.delete(id));
export const clearShots = () => tx('readwrite', (s) => s.clear());

export function shrink(source: HTMLImageElement | HTMLVideoElement, width: number, height: number) {
  const scale = Math.min(1, MAX_WIDTH / width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

export function fromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dataUrl = shrink(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했어요'));
    };
    img.src = url;
  });
}

export async function fromDisplay(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return shrink(video, video.videoWidth, video.videoHeight);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export const canCaptureDisplay = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
