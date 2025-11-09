import React, { useState, useEffect, useRef } from 'react';
import './ultra-premium.css';
import { transcribeAndSave } from './ai-transcript-handler.js';
import { getAllTranscripts, deleteTranscript, initDB } from './transcript-storage.js';
import { downloadLogsJSON, downloadLogsCSV, downloadLogsTXT } from './log-downloader.js';
import { getCurrentUser } from './supabase-client.js';

const VIEWS = { TRANSCRIBE: 'transcribe', LIBRARY: 'library', LOGS: 'logs', SETTINGS: 'settings', BUY_TOKENS: 'buy-tokens' };

export default function UltraPremiumApp() {
  const [view, setView] = useState(VIEWS.TRANSCRIBE);
  const [transcripts, setTranscripts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initDB();
    loadData();
    getCurrentUser().then(user => setCurrentUser(user));
  }, []);

  const loadData = async () => {
    const t = await getAllTranscripts();
    setTranscripts(t);
  };

  return (
    <>
    <div className="ultra-app">
      <div className="ultra-header">
        <div className="ultra-logo">🎙️ VCB TRANSCRIPTION</div>
        <div className="ultra-tokens">
          <div className="token-display">0 TOKENS</div>
          <button className="ultra-btn ultra-btn-primary" onClick={() => setView(VIEWS.BUY_TOKENS)}>BUY TOKENS</button>
        </div>
      </div>

      <div className="ultra-main">
        <div className="ultra-sidebar">
          {[
            { id: VIEWS.TRANSCRIBE, icon: '🎤', label: 'Transcribe' },
            { id: VIEWS.LIBRARY, icon: '📚', label: 'Library' },
            { id: VIEWS.SETTINGS, icon: '⚙️', label: 'Settings' }
          ].map(item => (
            <div
              key={item.id}
              className={`ultra-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              <span style={{fontSize: '20px'}}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="ultra-content">
          {view === VIEWS.TRANSCRIBE && <TranscribeView onComplete={loadData} />}
          {view === VIEWS.LIBRARY && <LibraryView transcripts={transcripts} onUpdate={loadData} />}
          {view === VIEWS.BUY_TOKENS && <div style={{padding:'40px',textAlign:'center'}}>Token purchase coming soon</div>}
          {view === VIEWS.SETTINGS && <SettingsView currentUser={currentUser} />}
        </div>
      </div>
    </div>
    </>
  );
}

function TranscribeView({ onComplete }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState({ sentiment: false, format: 'none' });

  const handleTranscribe = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      await transcribeAndSave(file, 'auto-detect', {
        detectSentiment: options.sentiment,
        premiumFormat: options.format !== 'none' ? options.format : null
      });
      alert('✅ Transcription Complete!');
      setFile(null);
      onComplete();
    } catch (error) {
      alert('❌ Failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <h1 className="ultra-title">New Transcription</h1>
      
      <UploadZone onFileSelect={setFile} selectedFile={file} />
      
      {file && (
        <>
          <div style={{ marginTop: '32px' }}>
            <div style={{ padding: '16px', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--premium-gold)', borderRadius: '12px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--premium-gold)', fontSize: '14px', fontWeight: '500' }}>🌍 AUTO-DETECT: Language will be automatically detected from audio</p>
            </div>

            <div className="ultra-form-group">
              <label className="ultra-label">Premium Format</label>
              <select className="ultra-select" value={options.format} onChange={(e) => setOptions({...options, format: e.target.value})}>
                <option value="none">Basic</option>
                <option value="professional">Professional</option>
                <option value="court">Court Transcript</option>
                <option value="meeting">Meeting Minutes</option>
              </select>
            </div>

            <div className="ultra-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={options.sentiment} onChange={(e) => setOptions({...options, sentiment: e.target.checked})} />
                <span className="ultra-label" style={{ margin: 0 }}>Detect Sentiment</span>
              </label>
            </div>
          </div>

          <button className="ultra-btn ultra-btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={handleTranscribe} disabled={processing}>
            {processing ? '⏳ PROCESSING...' : '🚀 START TRANSCRIPTION'}
          </button>
        </>
      )}
    </>
  );
}

function UploadZone({ onFileSelect, selectedFile }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`ultra-upload ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onFileSelect(e.dataTransfer.files[0]); }}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input id="file-input" type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => onFileSelect(e.target.files[0])} />
      {selectedFile ? (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>{selectedFile.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </>
      ) : (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📁</div>
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Drop Audio File Here</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>or click to browse</p>
        </>
      )}
    </div>
  );
}

function LibraryView({ transcripts, onUpdate }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <h1 className="ultra-title">Transcript Library ({transcripts.length})</h1>
      
      {transcripts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '60px', fontSize: '18px' }}>No transcripts yet</p>
      ) : (
        transcripts.map(t => (
          <div key={t.id} className="ultra-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>{t.audioName}</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="ultra-badge ultra-badge-blue">{t.language}</span>
                  {t.translations?.length > 0 && <span className="ultra-badge ultra-badge-gold">{t.translations.length} translations</span>}
                  {t.sentiment && <span className="ultra-badge ultra-badge-gray">{t.sentiment.overall}</span>}
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{new Date(t.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="ultra-btn ultra-btn-secondary" onClick={() => setSelected(t)}>VIEW</button>
                <button className="ultra-btn ultra-btn-secondary" onClick={async () => { if (confirm('Delete?')) { await deleteTranscript(t.id); onUpdate(); }}}>DELETE</button>
              </div>
            </div>
          </div>
        ))
      )}

      {selected && (
        <div className="ultra-modal-overlay" onClick={() => setSelected(null)}>
          <div className="ultra-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>{selected.audioName}</h2>
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--premium-gold)' }}>TRANSCRIPTION</h4>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)' }}>{selected.transcription}</p>
            </div>
            {selected.translations?.map(tr => (
              <div key={tr.language} style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--premium-gold)' }}>{tr.language.toUpperCase()}</h4>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: 'rgba(255,255,255,0.9)' }}>{tr.text}</p>
              </div>
            ))}
            <button className="ultra-btn ultra-btn-secondary" onClick={() => setSelected(null)}>CLOSE</button>
          </div>
        </div>
      )}
    </>
  );
}

function LogsView({ logs }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="ultra-title" style={{ margin: 0 }}>Activity Logs ({logs.length})</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="ultra-btn ultra-btn-secondary" onClick={downloadLogsJSON}>JSON</button>
          <button className="ultra-btn ultra-btn-secondary" onClick={downloadLogsCSV}>CSV</button>
          <button className="ultra-btn ultra-btn-secondary" onClick={downloadLogsTXT}>TXT</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '60px', fontSize: '18px' }}>No logs available</p>
      ) : (
        logs.map(log => (
          <div key={log.id} className="ultra-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="ultra-badge ultra-badge-blue">{log.event_type}</span>
                <p style={{ marginTop: '12px', fontSize: '16px' }}>{log.event_data?.action}</p>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{new Date(log.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function SettingsView({ currentUser }) {
  return (
    <>
      <h1 className="ultra-title">Settings</h1>
      
      <div className="ultra-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>Account</h3>
        <div className="ultra-form-group">
          <label className="ultra-label">Email</label>
          <input className="ultra-input" type="email" value={currentUser?.email || 'Not signed in'} readOnly />
        </div>
      </div>

      <div className="ultra-card">
        <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>Preferences</h3>
        <div style={{ padding: '16px', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--premium-gold)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--premium-gold)', fontSize: '14px', fontWeight: '500' }}>🌍 Language Auto-Detection Enabled</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '8px' }}>All 11 South African languages are automatically detected</p>
        </div>
      </div>
    </>
  );
}
