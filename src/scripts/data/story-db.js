const DB_NAME = 'story-map-db';
const DB_VERSION = 2;
const SAVED_STORE = 'savedStories';
const CACHED_STORE = 'cachedStories';
const PENDING_STORE = 'pendingStories';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Browser tidak mendukung IndexedDB.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(SAVED_STORE)) {
        const store = db.createObjectStore(SAVED_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(CACHED_STORE)) {
        const store = db.createObjectStore(CACHED_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        const store = db.createObjectStore(PENDING_STORE, {
          keyPath: 'localId',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request;

    try {
      request = callback(store);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => db.close());
}

function normalizeStory(story) {
  return {
    id: story.id,
    name: story.name || 'Pengguna Story',
    description: story.description || '',
    photoUrl: story.photoUrl || '',
    createdAt: story.createdAt || new Date().toISOString(),
    lat: story.lat ?? null,
    lon: story.lon ?? null,
    savedAt: story.savedAt || new Date().toISOString(),
  };
}

const StoryDb = {
  async saveStory(story) {
    const storyToSave = normalizeStory(story);
    return withStore(SAVED_STORE, 'readwrite', (store) => store.put(storyToSave));
  },

  async saveStories(stories = []) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SAVED_STORE, 'readwrite');
      const store = transaction.objectStore(SAVED_STORE);

      stories.forEach((story) => store.put(normalizeStory(story)));

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }).finally(() => db.close());
  },

  async deleteStory(id) {
    return withStore(SAVED_STORE, 'readwrite', (store) => store.delete(id));
  },

  async getSavedStory(id) {
    return withStore(SAVED_STORE, 'readonly', (store) => store.get(id));
  },

  async getSavedStories() {
    return withStore(SAVED_STORE, 'readonly', (store) => store.getAll());
  },

  async saveCachedStory(story) {
    return withStore(CACHED_STORE, 'readwrite', (store) => store.put(normalizeStory(story)));
  },

  async saveCachedStories(stories = []) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHED_STORE, 'readwrite');
      const store = transaction.objectStore(CACHED_STORE);

      stories.forEach((story) => store.put(normalizeStory(story)));

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }).finally(() => db.close());
  },

  async getCachedStory(id) {
    const savedStory = await this.getSavedStory(id);
    if (savedStory) return savedStory;
    return withStore(CACHED_STORE, 'readonly', (store) => store.get(id));
  },

  async getCachedStories() {
    return withStore(CACHED_STORE, 'readonly', (store) => store.getAll());
  },

  async savePendingStory({ description, photo, lat, lon }) {
    const pendingStory = {
      description,
      photo,
      photoName: photo?.name || `offline-story-${Date.now()}.jpg`,
      photoType: photo?.type || 'image/jpeg',
      lat,
      lon,
      createdAt: new Date().toISOString(),
    };

    return withStore(PENDING_STORE, 'readwrite', (store) => store.add(pendingStory));
  },

  async getPendingStories() {
    return withStore(PENDING_STORE, 'readonly', (store) => store.getAll());
  },

  async deletePendingStory(localId) {
    return withStore(PENDING_STORE, 'readwrite', (store) => store.delete(localId));
  },

  async countPendingStories() {
    return withStore(PENDING_STORE, 'readonly', (store) => store.count());
  },
};

export default StoryDb;
