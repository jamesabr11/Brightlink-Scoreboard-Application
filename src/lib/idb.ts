// Blob storage in IndexedDB, shared by logos and media. Game state only ever
// holds ids, so images and videos never slow down the state that's rewritten
// and broadcast on every action. Each call opens the database and closes it
// after: these are rare, operator-driven operations.
export const idbStores = (dbName: string, storeNames: string[]) => {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => storeNames.forEach((name) => request.result.createObjectStore(name));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  return async <T,>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = run(transaction.objectStore(storeName));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  };
};
