import React, { useState, useEffect } from 'react';
import {
  initDB,
  saveTranscript,
  getTranscript,
  getAllTranscripts,
  deleteTranscript,
  clearAllTranscripts,
  getTranscriptIds
} from './transcript-storage.js';
import { addTranslation, removeTranslation } from './translation-manager.js';

export default function TranscriptManager() {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [newLang, setNewLang] = useState('');

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      await initDB();
      const data = await getAllTranscripts();
      setTranscripts(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Failed to load transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transcript?')) return;
    try {
      await deleteTranscript(id);
      await loadTranscripts();
      if (selectedTranscript?.id === id) setSelectedTranscript(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete all transcripts?')) return;
    try {
      await clearAllTranscripts();
      setTranscripts([]);
      setSelectedTranscript(null);
    } catch (error) {
      console.error('Failed to clear:', error);
    }
  };

  const handleView = async (id) => {
    try {
      const transcript = await getTranscript(id);
      setSelectedTranscript(transcript);
    } catch (error) {
      console.error('Failed to load transcript:', error);
    }
  };

  const handleAddTranslation = async () => {
    if (!newLang || !selectedTranscript) return;
    setTranslating(true);
    try {
      await addTranslation(selectedTranscript.id, newLang);
      const updated = await getTranscript(selectedTranscript.id);
      setSelectedTranscript(updated);
      setNewLang('');
    } catch (error) {
      alert('Translation failed: ' + error.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleRemoveTranslation = async (language) => {
    if (!confirm(`Remove ${language} translation?`)) return;
    try {
      await removeTranslation(selectedTranscript.id, language);
      const updated = await getTranscript(selectedTranscript.id);
      setSelectedTranscript(updated);
    } catch (error) {
      alert('Failed to remove translation');
    }
  };

  if (loading) return <div style={styles.loading}>Loading transcripts...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Transcript Manager</h2>
        <button onClick={handleClearAll} style={styles.clearBtn}>Clear All</button>
      </div>

      <div style={styles.content}>
        <div style={styles.list}>
          <h3>Saved Transcripts ({transcripts.length})</h3>
          {transcripts.length === 0 ? (
            <p style={styles.empty}>No transcripts saved</p>
          ) : (
            transcripts.map(t => (
              <div key={t.id} style={styles.item}>
                <div style={styles.itemInfo}>
                  <strong>{t.audioName}</strong>
                  <small>{new Date(t.timestamp).toLocaleString()}</small>
                  <span>{t.language}</span>
                </div>
                <div style={styles.itemActions}>
                  <button onClick={() => handleView(t.id)} style={styles.viewBtn}>View</button>
                  <button onClick={() => handleDelete(t.id)} style={styles.deleteBtn}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.detail}>
          {selectedTranscript ? (
            <>
              <h3>{selectedTranscript.audioName}</h3>
              <p><strong>Language:</strong> {selectedTranscript.language}</p>
              <p><strong>Date:</strong> {new Date(selectedTranscript.timestamp).toLocaleString()}</p>
              {selectedTranscript.duration && <p><strong>Duration:</strong> {selectedTranscript.duration}s</p>}
              
              <div style={styles.section}>
                <h4>Transcription</h4>
                <p style={styles.text}>{selectedTranscript.transcription}</p>
              </div>
              
              <div style={styles.section}>
                <h4>Translations ({selectedTranscript.translations?.length || 0})</h4>
                {selectedTranscript.translations?.length > 0 ? (
                  selectedTranscript.translations.map(t => (
                    <div key={t.language} style={styles.translationItem}>
                      <div style={styles.translationHeader}>
                        <strong>{t.language}</strong>
                        <button onClick={() => handleRemoveTranslation(t.language)} style={styles.removeBtn}>×</button>
                      </div>
                      <p style={styles.text}>{t.text}</p>
                    </div>
                  ))
                ) : (
                  <p style={styles.empty}>No translations yet</p>
                )}
                <div style={styles.addTranslation}>
                  <input
                    type="text"
                    placeholder="Language (e.g., Spanish)"
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    style={styles.input}
                  />
                  <button onClick={handleAddTranslation} disabled={translating} style={styles.addBtn}>
                    {translating ? 'Translating...' : 'Add Translation'}
                  </button>
                </div>
              </div>
              
              {selectedTranscript.sentiment && (
                <div style={styles.section}>
                  <h4>Sentiment Analysis</h4>
                  <p><strong>Overall:</strong> <span style={{color: selectedTranscript.sentiment.overall === 'positive' ? '#28a745' : selectedTranscript.sentiment.overall === 'negative' ? '#dc3545' : '#6c757d'}}>{selectedTranscript.sentiment.overall}</span></p>
                  <p><strong>Score:</strong> {selectedTranscript.sentiment.score}</p>
                  {selectedTranscript.sentiment.emotions?.length > 0 && (
                    <p><strong>Emotions:</strong> {selectedTranscript.sentiment.emotions.join(', ')}</p>
                  )}
                  <p><strong>Summary:</strong> {selectedTranscript.sentiment.summary}</p>
                </div>
              )}
              
              {selectedTranscript.isPremium && selectedTranscript.premiumFormat && (
                <div style={styles.section}>
                  <h4>Professional Format</h4>
                  <p style={styles.text}>{selectedTranscript.premiumFormat}</p>
                </div>
              )}
            </>
          ) : (
            <p style={styles.empty}>Select a transcript to view</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  clearBtn: { padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  content: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' },
  list: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', maxHeight: '600px', overflowY: 'auto' },
  item: { padding: '12px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  itemActions: { display: 'flex', gap: '8px' },
  viewBtn: { padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  detail: { border: '1px solid #ddd', borderRadius: '8px', padding: '20px', maxHeight: '600px', overflowY: 'auto' },
  section: { marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' },
  text: { whiteSpace: 'pre-wrap', lineHeight: '1.6' },
  empty: { color: '#999', textAlign: 'center', padding: '20px' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px' },
  translationItem: { marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' },
  translationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  removeBtn: { background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '16px' },
  addTranslation: { display: 'flex', gap: '8px', marginTop: '15px' },
  input: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
  addBtn: { padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
