import React, { useState, useEffect } from 'react';
import './modern-ui.css';
import { transcribeAndSave } from './ai-transcript-handler.js';
import { getAllTranscripts, deleteTranscript, initDB } from './transcript-storage.js';
import { addTranslation } from './translation-manager.js';
import { downloadLogsJSON, downloadLogsCSV, downloadLogsTXT } from './log-downloader.js';
import { getUserAuditLogs, getCurrentUser } from './supabase-client.js';

const VIEWS = { TRANSCRIBE: 'transcribe', LIBRARY: 'library', LOGS: 'logs', SETTINGS: 'settings' };

export default function IntegratedModernApp() {
  const [currentView, setCurrentView] = useState(VIEWS.TRANSCRIBE);
  const [tokens, setTokens] = useState(1000);
  const [transcripts, setTranscripts] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    initDB();
    loadData();
  }, []);

  const loadData = async () => {
    const t = await getAllTranscripts();
    setTranscripts(t);
    
    try {
      const user = await getCurrentUser();
      if (user) {
        const l = await getUserAuditLogs(user.id, 100);
        setLogs(l || []);
      }
    } catch (e) {
      console.log('Logs not available');
    }
  };

  return (
    <div className="app-container">
      <Header tokens={tokens} />
      <div className="main-layout">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="content">
          {currentView === VIEWS.TRANSCRIBE && <TranscribeView onComplete={loadData} />}
          {currentView === VIEWS.LIBRARY && <LibraryView transcripts={transcripts} onUpdate={loadData} />}
          {currentView === VIEWS.LOGS && <LogsView logs={logs} />}
          {currentView === VIEWS.SETTINGS && <SettingsView />}
        </div>
      </div>
    </div>
  );
}

function Header({ tokens }) {
  return (
    <div className="header">
      <div className="logo">🎙️ VCB Transcription</div>
      <div className="user-info">
        <div className="token-badge">{tokens} tokens</div>
        <button className="btn btn-primary">Buy Tokens</button>
      </div>
    </div>
  );
}

function Sidebar({ currentView, onViewChange }) {
  const items = [
    { id: VIEWS.TRANSCRIBE, icon: '🎤', label: 'Transcribe' },
    { id: VIEWS.LIBRARY, icon: '📚', label: 'Library' },
    { id: VIEWS.LOGS, icon: '📊', label: 'Activity Logs' },
    { id: VIEWS.SETTINGS, icon: '⚙️', label: 'Settings' }
  ];

  return (
    <div className="sidebar">
      {items.map(item => (
        <div
          key={item.id}
          className={`nav-item ${currentView === item.id ? 'active' : ''}`}
          onClick={() => onViewChange(item.id)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function TranscribeView({ onComplete }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState({
    language: 'English',
    sentiment: false,
    format: 'none'
  });

  const handleTranscribe = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      await transcribeAndSave(file, options.language, {
        detectSentiment: options.sentiment,
        premiumFormat: options.format !== 'none' ? options.format : null
      });
      alert('Transcription complete!');
      setFile(null);
      onComplete();
    } catch (error) {
      alert('Failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>New Transcription</h1>
      
      <UploadZone onFileSelect={setFile} selectedFile={file} />
      
      {file && (
        <>
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Options</h3>
            
            <div className="form-group">
              <label className="form-label">Language</label>
              <select 
                className="form-select"
                value={options.language}
                onChange={(e) => setOptions({...options, language: e.target.value})}
              >
                <option>English</option>
                <option>Afrikaans</option>
                <option>Zulu</option>
                <option>Xhosa</option>
                <option>Sotho</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Premium Format</label>
              <select 
                className="form-select"
                value={options.format}
                onChange={(e) => setOptions({...options, format: e.target.value})}
              >
                <option value="none">Basic</option>
                <option value="professional">Professional</option>
                <option value="court">Court Transcript</option>
                <option value="meeting">Meeting Minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={options.sentiment}
                  onChange={(e) => setOptions({...options, sentiment: e.target.checked})}
                />
                <span className="form-label" style={{ margin: 0 }}>Detect Sentiment</span>
              </label>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '24px', width: '100%' }}
            onClick={handleTranscribe}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Start Transcription'}
          </button>
        </>
      )}
    </div>
  );
}

function UploadZone({ onFileSelect, selectedFile }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => onFileSelect(e.target.files[0])}
      />
      {selectedFile ? (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3>{selectedFile.name}</h3>
          <p style={{ color: 'var(--gray)', marginTop: '8px' }}>
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <h3>Drop audio file here</h3>
          <p style={{ color: 'var(--gray)', marginTop: '8px' }}>or click to browse</p>
        </>
      )}
    </div>
  );
}

function LibraryView({ transcripts, onUpdate }) {
  const [selected, setSelected] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transcript?')) return;
    await deleteTranscript(id);
    onUpdate();
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Transcript Library ({transcripts.length})</h1>
      
      {transcripts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '40px' }}>No transcripts yet</p>
      ) : (
        transcripts.map(t => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>{t.audioName}</h3>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <span className="badge badge-info">{t.language}</span>
                  {t.translations?.length > 0 && (
                    <span className="badge badge-success">{t.translations.length} translations</span>
                  )}
                  {t.sentiment && (
                    <span className={`badge badge-${t.sentiment.overall === 'positive' ? 'success' : t.sentiment.overall === 'negative' ? 'danger' : 'warning'}`}>
                      {t.sentiment.overall}
                    </span>
                  )}
                  <span style={{ color: 'var(--gray)', fontSize: '14px' }}>
                    {new Date(t.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setSelected(t)}>View</button>
                <button className="btn btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      )}

      {selected && (
        <TranscriptModal transcript={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function TranscriptModal({ transcript, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{transcript.audioName}</h2>
        <div style={{ marginTop: '20px' }}>
          <h4>Transcription</h4>
          <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{transcript.transcription}</p>
        </div>
        {transcript.translations?.map(t => (
          <div key={t.language} style={{ marginTop: '20px' }}>
            <h4>{t.language} Translation</h4>
            <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{t.text}</p>
          </div>
        ))}
        <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function LogsView({ logs }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Activity Logs ({logs.length})</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={downloadLogsJSON}>JSON</button>
          <button className="btn btn-secondary" onClick={downloadLogsCSV}>CSV</button>
          <button className="btn btn-secondary" onClick={downloadLogsTXT}>TXT</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '40px' }}>No logs available</p>
      ) : (
        logs.map(log => (
          <div key={log.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-info">{log.event_type}</span>
                <p style={{ marginTop: '8px', fontWeight: 500 }}>{log.event_data?.action}</p>
              </div>
              <span style={{ color: 'var(--gray)', fontSize: '14px' }}>
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SettingsView() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Settings</h1>
      
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Account</h3>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value="user@example.com" readOnly />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Preferences</h3>
        <div className="form-group">
          <label className="form-label">Default Language</label>
          <select className="form-select">
            <option>English</option>
            <option>Afrikaans</option>
          </select>
        </div>
      </div>

      <button className="btn btn-danger">Delete Account</button>
    </div>
  );
}
