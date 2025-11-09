// Transcript Storage Manager - IndexedDB + LocalStorage
const DB_NAME = 'vcb_transcripts';
const DB_VERSION = 1;
const STORE_NAME = 'transcripts';
const LS_KEY = 'vcb_transcript_ids';

let db = null;

// Initialize IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('language', 'language', { unique: false });
      }
    };
  });
};

// Save transcript to IndexedDB
export const saveTranscript = async (transcript) => {
  if (!db) await initDB();
  
  const data = {
    id: transcript.id || `transcript_${Date.now()}`,
    timestamp: Date.now(),
    audioName: transcript.audioName,
    language: transcript.language,
    transcription: transcript.transcription,
    translations: transcript.translations || [],
    duration: transcript.duration,
    sentiment: transcript.sentiment,
    isPremium: transcript.isPremium || false,
    premiumFormat: transcript.premiumFormat,
  };
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data);
    
    request.onsuccess = () => {
      updateLocalStorageIndex(data.id);
      resolve(data.id);
    };
    request.onerror = () => reject(request.error);
  });
};

// Get transcript by ID
export const getTranscript = async (id) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all transcripts
export const getAllTranscripts = async () => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete transcript
export const deleteTranscript = async (id) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      removeFromLocalStorageIndex(id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// Update localStorage index
const updateLocalStorageIndex = (id) => {
  const ids = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  }
};

// Remove from localStorage index
const removeFromLocalStorageIndex = (id) => {
  const ids = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const filtered = ids.filter(i => i !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(filtered));
};

// Get transcript IDs from localStorage
export const getTranscriptIds = () => {
  return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
};

// Clear all transcripts
export const clearAllTranscripts = async () => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => {
      localStorage.removeItem(LS_KEY);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};
