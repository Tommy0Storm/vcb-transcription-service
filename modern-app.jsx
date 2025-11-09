import React, { useState } from 'react';
import './modern-ui.css';

const VIEWS = {
  TRANSCRIBE: 'transcribe',
  LIBRARY: 'library',
  LOGS: 'logs',
  SETTINGS: 'settings'
};

export default function ModernApp() {
  const [currentView, setCurrentView] = useState(VIEWS.TRANSCRIBE);
  const [tokens, setTokens] = useState(1000);

  return (
    <div className="app-container">
      <Header tokens={tokens} />
      <div className="main-layout">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="content">
          {currentView === VIEWS.TRANSCRIBE && <TranscribeView />}
          {currentView === VIEWS.LIBRARY && <LibraryView />}
          {currentView === VIEWS.LOGS && <LogsView />}
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

function TranscribeView() {
  const [file, setFile] = useState(null);
  const [options, setOptions] = useState({
    language: 'English',
    sentiment: false,
    format: 'none'
  });

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

          <button className="btn btn-primary" style={{ marginTop: '24px', width: '100%' }}>
            Start Transcription
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

function LibraryView() {
  const transcripts = [
    { id: 1, name: 'Meeting Recording.mp3', date: '2024-01-15', language: 'English', translations: 2 },
    { id: 2, name: 'Interview.wav', date: '2024-01-14', language: 'Afrikaans', translations: 1 },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Transcript Library</h1>
      
      {transcripts.map(t => (
        <div key={t.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{t.name}</h3>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <span className="badge badge-info">{t.language}</span>
                <span className="badge badge-success">{t.translations} translations</span>
                <span style={{ color: 'var(--gray)', fontSize: '14px' }}>{t.date}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary">View</button>
              <button className="btn btn-primary">Download</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogsView() {
  const logs = [
    { id: 1, type: 'TRANSCRIPTION_COMPLETE', action: 'Transcription completed', time: '2 hours ago' },
    { id: 2, type: 'SESSION_START', action: 'User logged in', time: '3 hours ago' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Activity Logs</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary">JSON</button>
          <button className="btn btn-secondary">CSV</button>
          <button className="btn btn-secondary">TXT</button>
        </div>
      </div>

      {logs.map(log => (
        <div key={log.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-info">{log.type}</span>
              <p style={{ marginTop: '8px', fontWeight: 500 }}>{log.action}</p>
            </div>
            <span style={{ color: 'var(--gray)', fontSize: '14px' }}>{log.time}</span>
          </div>
        </div>
      ))}
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
