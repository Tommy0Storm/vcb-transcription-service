import React, { useState } from 'react';
import { transcribeAndSave } from './ai-transcript-handler.js';

export default function TranscriptOptions({ onComplete }) {
  const [audioFile, setAudioFile] = useState(null);
  const [language, setLanguage] = useState('English');
  const [detectSentiment, setDetectSentiment] = useState(false);
  const [premiumFormat, setPremiumFormat] = useState('none');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) return;

    setProcessing(true);
    try {
      const options = {
        detectSentiment,
        premiumFormat: premiumFormat !== 'none' ? premiumFormat : null,
      };

      const result = await transcribeAndSave(audioFile, language, options);
      onComplete?.(result);
    } catch (error) {
      alert('Transcription failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>Transcription Options</h3>
      
      <div style={styles.field}>
        <label>Audio File</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setAudioFile(e.target.files[0])}
          required
        />
      </div>

      <div style={styles.field}>
        <label>Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option>English</option>
          <option>Afrikaans</option>
          <option>Zulu</option>
          <option>Xhosa</option>
          <option>Sotho</option>
        </select>
      </div>

      <div style={styles.field}>
        <label>
          <input
            type="checkbox"
            checked={detectSentiment}
            onChange={(e) => setDetectSentiment(e.target.checked)}
          />
          Detect Sentiment
        </label>
      </div>

      <div style={styles.field}>
        <label>Premium Format</label>
        <select value={premiumFormat} onChange={(e) => setPremiumFormat(e.target.value)}>
          <option value="none">None (Basic)</option>
          <option value="professional">Professional</option>
          <option value="court">Court Transcript</option>
          <option value="meeting">Meeting Minutes</option>
        </select>
      </div>

      <button type="submit" disabled={processing} style={styles.button}>
        {processing ? 'Processing...' : 'Transcribe'}
      </button>
    </form>
  );
}

const styles = {
  form: { padding: '20px', maxWidth: '500px', margin: '0 auto' },
  field: { marginBottom: '15px' },
  button: { padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }
};
