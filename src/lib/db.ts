// IndexedDB wrapper stub for future save/load functionality

const DB_NAME = 'fish-debt-db';
const DB_VERSION = 1;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('saves')) {
        db.createObjectStore('saves', { keyPath: 'id' });
      }
    };
  });
}

export async function saveGame(id: string, data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('saves', 'readwrite');
  const store = tx.objectStore('saves');
  store.put({ id, data, timestamp: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadGame(id: string): Promise<unknown | null> {
  const db = await openDB();
  const tx = db.transaction('saves', 'readonly');
  const store = tx.objectStore('saves');
  const request = store.get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSave(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('saves', 'readwrite');
  const store = tx.objectStore('saves');
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
