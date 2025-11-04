/**
 * VCB TRANSCRIPTION SERVICE - ENHANCED UI COMPONENTS
 *
 * React components for:
 * 1. Translation Selector
 * 2. Voice Synthesis Options
 * 3. Token Balance Widget
 * 4. Cost Estimator
 * 5. History Dashboard
 * 6. POPIA Warning Modal
 * 7. Token Purchase Page
 * 8. Settings Panel
 *
 * @author VCB AI
 * @version 2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Packer } from 'docx';
import {
  LANGUAGES,
  VOICE_OPTIONS,
  TOKEN_PACKAGES,
  translateTranscript,
  generateBilingualDocument,
  detectSpeakers,
  generateVoiceNarration,
  getTokenBalance,
  calculateServiceCost,
  deductTokens,
  getTranscriptionHistory,
  deleteTranscription,
  autoDeleteOldTranscriptions,
  initiateTokenPurchase,
  saveSetting,
  getSetting,
  downloadBlob,
  saveTranscription
} from './vcb-features-enhanced';

// Supabase imports for authentication and audit logging
import {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  logSessionStart,
  logSessionEnd,
  logPOPIAAcceptance,
  sendLoginNotification,
  downloadUserData
} from './supabase-client';

// ============================================================================
// ICONS
// ============================================================================

const Icon = ({ children, size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {children}
  </svg>
);

const ExportIcon = () => <Icon size={14}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></Icon>;
const RemoveIcon = () => <Icon size={14}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></Icon>;
const ListenIcon = () => <Icon size={14}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></Icon>;
const InfoIcon = () => <Icon size={14}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></Icon>;
const SearchIcon = () => <Icon size={14}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></Icon>;
const SpinnerIcon = () => (
  <svg width="18" height="18" viewBox="25 25 50 50" style={{ animation: 'spin 1.5s linear infinite' }}>
    <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" style={{ animation: 'dash 1.5s ease-in-out infinite' }} />
  </svg>
);
const TokenIcon = () => (
  <Icon size={18} strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 7v10"></path>
    <path d="M9 10h6"></path>
    <path d="M9 14h6"></path>
  </Icon>
);
const UserCircleIcon = () => (
  <Icon size={18} strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Z"></path>
    <path d="M7.5 18.5a7 7 0 0 1 9 0"></path>
  </Icon>
);

// ============================================================================
// 1. TRANSLATION SELECTOR
// ============================================================================

export const TranslationSelector = ({ onTranslationSelect, disabled = false }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const handleSelect = (e) => {
    const value = e.target.value;
    setSelectedLanguage(value);
    onTranslationSelect(value);
  };

  return (
    <div className="translation-selector">
      <h4 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
        Add Translation (Optional)
      </h4>
      <select
        value={selectedLanguage}
        onChange={handleSelect}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px',
          border: '2px solid #E0E0E0',
          borderRadius: '4px',
          fontSize: '14px',
          fontFamily: 'Quicksand, sans-serif'
        }}
      >
        <option value="">No Translation</option>
        <optgroup label="Official SA Languages">
          {LANGUAGES.official.filter(lang => lang.code !== 'en-US').map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </optgroup>
        <optgroup label="Foreign Languages">
          {LANGUAGES.foreign.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
};

// ============================================================================
// 2. VOICE SYNTHESIS OPTIONS
// ============================================================================

export const VoiceSynthesisOptions = ({ transcript, onVoiceGenerate, disabled = false }) => {
  const [voiceQuality, setVoiceQuality] = useState('standard');
  const [speakerVoices, setSpeakerVoices] = useState({});
  const [speakers, setSpeakers] = useState([]);

  useEffect(() => {
    if (transcript) {
      const detectedSpeakers = detectSpeakers(transcript);
      setSpeakers(detectedSpeakers);

      // Auto-assign default voices
      const defaultVoices = {};
      detectedSpeakers.forEach((speaker, idx) => {
        defaultVoices[speaker] = idx % 2 === 0 ?
          VOICE_OPTIONS.male[2].name : // Standard male
          VOICE_OPTIONS.female[2].name; // Standard female
      });
      setSpeakerVoices(defaultVoices);
    }
  }, [transcript]);

  const handleVoiceAssignment = (speaker, voiceName) => {
    setSpeakerVoices(prev => ({ ...prev, [speaker]: voiceName }));
  };

  const handleGenerate = () => {
    onVoiceGenerate({
      voiceQuality,
      speakerVoices,
      isWaveNet: voiceQuality === 'wavenet'
    });
  };

  return (
    <div className="voice-synthesis-options" style={{ marginTop: '24px' }}>
      <h4 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
        Add Voice Narration (Optional)
      </h4>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <input
            type="radio"
            value="standard"
            checked={voiceQuality === 'standard'}
            onChange={(e) => setVoiceQuality(e.target.value)}
            disabled={disabled}
          />
          <span style={{ marginLeft: '8px' }}>Standard Voice (Recommended)</span>
        </label>
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            value="wavenet"
            checked={voiceQuality === 'wavenet'}
            onChange={(e) => setVoiceQuality(e.target.value)}
            disabled={disabled}
          />
          <span style={{ marginLeft: '8px' }}>Premium WaveNet Voice (Higher quality)</span>
        </label>
      </div>

      {speakers.length > 0 && (
        <>
          <h5 style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
            Assign Voices to Speakers
          </h5>
          {speakers.slice(0, 6).map(speaker => (
            <div key={speaker} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ minWidth: '120px', fontSize: '13px' }}>{speaker}:</span>
              <select
                value={speakerVoices[speaker] || ''}
                onChange={(e) => handleVoiceAssignment(speaker, e.target.value)}
                disabled={disabled}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <optgroup label="Male Voices">
                  {VOICE_OPTIONS.male.map(voice => (
                    <option key={voice.name} value={voice.name}>{voice.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Female Voices">
                  {VOICE_OPTIONS.female.map(voice => (
                    <option key={voice.name} value={voice.name}>{voice.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          ))}
        </>
      )}

      <button
        onClick={handleGenerate}
        disabled={disabled || speakers.length === 0}
        className="button button-primary"
        style={{ marginTop: '16px', padding: '10px 20px' }}
      >
        <ListenIcon /> Generate Voice Narration
      </button>
    </div>
  );
};

// ============================================================================
// 3. TOKEN BALANCE WIDGET
// ============================================================================

export const TokenBalanceWidget = ({ onRefresh, currentUser }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const bal = await getTokenBalance();
      console.log('Token balance loaded:', bal);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load token balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();

    // Refresh only when onRefresh changes (user action), not every 5 seconds
    // Removed polling to reduce API calls and improve performance
  }, [onRefresh]);

  const tokensRemaining = balance?.tokensRemaining ?? 0;

  // Show guest version if not logged in
  if (!currentUser) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '76px',
        zIndex: 1000,
        fontFamily: 'Quicksand, sans-serif'
      }}>
        <button
          type="button"
          onClick={() => { window.location.hash = '#buy-tokens'; }}
          title="Local tokens (sign in to sync)"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '2px solid #ff9800',
            backgroundColor: '#FFFFFF',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            position: 'relative'
          }}
        >
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: 1
          }}>
            {new Intl.NumberFormat('en', {
              notation: 'compact',
              maximumFractionDigits: tokensRemaining >= 1000 ? 1 : 0
            }).format(tokensRemaining)}
          </span>
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#ff9800',
            border: '2px solid white'
          }} title="Guest mode - tokens not synced"></div>
        </button>
      </div>
    );
  }
  const compactBalance = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: tokensRemaining >= 1000 ? 1 : 0
  }).format(tokensRemaining);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '76px',
      zIndex: 1000,
      fontFamily: 'Quicksand, sans-serif'
    }}>
      <button
        type="button"
        onClick={() => { window.location.hash = '#buy-tokens'; }}
        title={`${tokensRemaining.toLocaleString()} tokens available`}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1px solid #E0E0E0',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          position: 'relative'
        }}
      >
        {loading ? (
          <SpinnerIcon />
        ) : (
          <span style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '11px',
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '0.02em'
          }}>
            <TokenIcon />
            {compactBalance}
          </span>
        )}
      </button>
    </div>
  );
};

// ============================================================================
// 4. COST ESTIMATOR
// ============================================================================

export const CostEstimator = ({ audioMinutes, options = {} }) => {
  const [cost, setCost] = useState(null);

  useEffect(() => {
    if (audioMinutes > 0) {
      const calculated = calculateServiceCost(audioMinutes, options);
      setCost(calculated);
    }
  }, [audioMinutes, options]);

  if (!cost) return null;

  return (
    <div className="cost-estimator" style={{
      backgroundColor: '#F8F9FA',
      border: '2px solid #E0E0E0',
      borderRadius: '6px',
      padding: '16px',
      marginTop: '16px'
    }}>
      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>
        Estimated Cost
      </h4>
      <div style={{ fontSize: '13px', fontWeight: 300, lineHeight: '1.6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span>Transcription:</span>
          <span>R {cost.breakdown.transcription}</span>
        </div>
        {options.translation && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Translation:</span>
            <span>R {cost.breakdown.translation}</span>
          </div>
        )}
        {options.voiceSynthesis && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Voice Synthesis:</span>
            <span>R {cost.breakdown.voiceSynthesis}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid #E0E0E0', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <strong>Total:</strong>
          <strong>{cost.tokens} tokens (R {cost.costInRands})</strong>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. HISTORY DASHBOARD
// ============================================================================

export const HistoryDashboard = () => {
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showLocalToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getTranscriptionHistory(filters);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
      showLocalToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const handleDownload = async (id, type) => {
    const record = history.find(h => h.transcriptionId === id);
    if (!record) return;

    if (type === 'document' && record.documentBlob) {
      downloadBlob(record.documentBlob, `${record.fileName}_transcript.docx`);
    } else if (type === 'audio' && record.audioBlob) {
      downloadBlob(record.audioBlob, `${record.fileName}_voice.mp3`);
    }
  };

  const handleDeleteClick = (id) => {
    const record = history.find(h => h.transcriptionId === id);
    setDeleteConfirm(record);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteTranscription(deleteConfirm.transcriptionId);
      loadHistory();
      showLocalToast('Transcription deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete:', error);
      showLocalToast('Failed to delete transcription', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const filteredHistory = history.filter(item =>
    item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="history-dashboard" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', textTransform: 'uppercase' }}>
        Transcription History
      </h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <SearchIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: '2px solid #E0E0E0',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <select
          onChange={(e) => setFilters({ ...filters, templateType: e.target.value })}
          style={{ padding: '10px', border: '2px solid #E0E0E0', borderRadius: '4px', fontSize: '14px' }}
        >
          <option value="">All Types</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="HIGH_COURT">High Court</option>
        </select>

        <input
          type="date"
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          style={{ padding: '10px', border: '2px solid #E0E0E0', borderRadius: '4px', fontSize: '14px' }}
        />
        <input
          type="date"
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          style={{ padding: '10px', border: '2px solid #E0E0E0', borderRadius: '4px', fontSize: '14px' }}
        />
      </div>

      {/* History Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <SpinnerIcon />
          <p style={{ marginTop: '16px' }}>Loading history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6C757D' }}>
          <p>No transcriptions found</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #000000' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>File Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Duration</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Language(s)</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Tokens</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map(item => (
              <tr key={item.transcriptionId} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={{ padding: '12px' }}>{new Date(item.uploadDate).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{item.fileName}</td>
                <td style={{ padding: '12px' }}>{item.duration}</td>
                <td style={{ padding: '12px' }}>
                  {item.sourceLanguage}
                  {item.targetLanguage && ` → ${item.targetLanguage}`}
                </td>
                <td style={{ padding: '12px' }}>{item.templateType}</td>
                <td style={{ padding: '12px' }}>{item.tokensCost}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDownload(item.transcriptionId, 'document')}
                      className="button button-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <ExportIcon /> Doc
                    </button>
                    {item.audioBlob && (
                      <button
                        onClick={() => handleDownload(item.transcriptionId, 'audio')}
                        className="button button-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <ListenIcon /> Audio
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(item.transcriptionId)}
                      className="button"
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#000000', color: '#FFFFFF' }}
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '32px',
            borderRadius: '8px',
            maxWidth: '450px',
            border: '2px solid #000000'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase' }}>
              Confirm Delete
            </h2>
            <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              <p style={{ marginBottom: '12px' }}>
                Are you sure you want to delete this transcription?
              </p>
              <div style={{ backgroundColor: '#F8F9FA', padding: '12px', borderRadius: '4px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {deleteConfirm.fileName}
                </div>
                <div style={{ fontSize: '13px', color: '#6C757D' }}>
                  {new Date(deleteConfirm.uploadDate).toLocaleDateString()}
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#DC3545' }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelDelete}
                className="button button-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="button"
                style={{ flex: 1, padding: '10px', backgroundColor: '#DC3545', color: '#FFFFFF', border: 'none' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'success' ? '#28A745' : toast.type === 'error' ? '#DC3545' : '#17A2B8',
          color: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. POPIA WARNING MODAL
// ============================================================================

export const POPIAWarningModal = ({ onAccept, currentUser }) => {
  // Check if POPIA has been accepted (localStorage for all users)
  const [hasAccepted, setHasAccepted] = useState(() => {
    return localStorage.getItem('popiaAccepted') === 'true';
  });

  const handleAccept = async () => {
    // Store acceptance in localStorage for all users
    localStorage.setItem('popiaAccepted', 'true');
    setHasAccepted(true);

    // Log POPIA acceptance to audit trail (only for logged-in users)
    if (currentUser) {
      try {
        await logPOPIAAcceptance(currentUser.id);
        console.log('POPIA acceptance logged for user:', currentUser.email);
      } catch (error) {
        console.error('Failed to log POPIA acceptance:', error);
      }
    } else {
      console.log('POPIA accepted by guest user (stored locally)');
    }

    if (onAccept) onAccept();
  };

  // Hide modal if already accepted
  if (hasAccepted) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '40px',
        borderRadius: '8px',
        maxWidth: '500px',
        border: '2px solid #000000'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase' }}>
          DATA PRIVACY NOTICE
        </h2>

        <div style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '24px' }}>
          <p style={{ marginBottom: '16px' }}>
            Your transcriptions are stored <strong>LOCALLY on your device only</strong>.
          </p>
          <p style={{ marginBottom: '16px' }}>
            We do <strong>NOT</strong> store, transmit, or access your audio files or transcriptions.
          </p>

          <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
            <li>✓ All data remains on YOUR device</li>
            <li>✓ Files automatically deleted after 30 days</li>
            <li>✓ You can export/backup your history at any time</li>
          </ul>

          <p style={{ fontSize: '13px', marginBottom: '12px' }}>
            <strong>What we log:</strong> We keep secure audit logs of your account activity
            (logins, token purchases, transcriptions) for 60 days to help resolve any disputes.
            These logs are encrypted and only accessible by you and our support team.
          </p>

          <p style={{ fontSize: '13px', fontWeight: 500, color: '#6C757D' }}>
            This app is fully compliant with <strong>POPIA</strong> (Protection of Personal Information Act).
          </p>
        </div>

        <button
          onClick={handleAccept}
          className="button button-primary"
          style={{ width: '100%', padding: '12px', backgroundColor: '#000000', color: '#FFFFFF' }}
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 7. TOKEN PURCHASE PAGE
// ============================================================================

export const TokenPurchasePage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmPackage, setConfirmPackage] = useState(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (pkg) => {
    setConfirmPackage(pkg);
  };

  const handleConfirmPurchase = () => {
    if (!confirmPackage) return;

    const userId = currentUser?.id || 'guest';
    const userEmail = currentUser?.email || '';

    console.log('Purchase confirmed:', { packageId: confirmPackage.id, userId, userEmail });
    initiateTokenPurchase(confirmPackage.id, userId, userEmail);
    setConfirmPackage(null);
  };

  const handleCancelPurchase = () => {
    setConfirmPackage(null);
  };

  return (
    <div style={{ padding: '48px 32px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase' }}>
        Buy Tokens
      </h1>
      <p style={{ fontSize: '14px', color: '#6C757D', marginBottom: '40px' }}>
        Purchase tokens to use for transcription, translation, and voice synthesis services.
      </p>

      {!loading && !currentUser && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          backgroundColor: '#FFF3CD',
          border: '1px solid #FFC107',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <strong>Note:</strong> You can purchase tokens as a guest, but we recommend signing in to track your purchases across devices.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
        {TOKEN_PACKAGES.map(pkg => (
          <div key={pkg.id} style={{
            backgroundColor: '#F8F9FA',
            border: '2px solid #E0E0E0',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>
              {pkg.label}
            </h3>
            <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
              {pkg.tokens.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', color: '#6C757D', marginBottom: '16px' }}>Tokens</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              R {pkg.price}
            </div>
            {pkg.discount && (
              <div style={{ fontSize: '12px', color: '#28A745', fontWeight: 500, marginBottom: '8px' }}>
                Save {pkg.discount}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#6C757D', marginBottom: '20px' }}>
              R {pkg.perToken.toFixed(2)} per token
            </div>
            <button
              onClick={() => handlePurchaseClick(pkg)}
              className="button button-primary"
              style={{ width: '100%', padding: '12px', backgroundColor: '#000000', color: '#FFFFFF' }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Purchase'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '48px', padding: '24px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Secure Payment</h3>
        <p style={{ fontSize: '13px', color: '#6C757D' }}>
          All payments are processed securely through PayFast, South Africa's leading payment gateway.
          Your payment information is never stored on our servers.
        </p>
      </div>

      {/* Purchase Confirmation Modal */}
      {confirmPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '40px',
            borderRadius: '8px',
            maxWidth: '450px',
            border: '2px solid #000000'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase' }}>
              Confirm Purchase
            </h2>
            <div style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '24px' }}>
              <p style={{ marginBottom: '16px' }}>You are about to purchase:</p>
              <div style={{ backgroundColor: '#F8F9FA', padding: '16px', borderRadius: '4px', marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                  {confirmPackage.label} Package
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#000000', marginBottom: '4px' }}>
                  {confirmPackage.tokens.toLocaleString()} tokens
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#000000' }}>
                  R {confirmPackage.price}
                </div>
                {confirmPackage.discount && (
                  <div style={{ fontSize: '12px', color: '#28A745', marginTop: '8px' }}>
                    {confirmPackage.discount} discount applied
                  </div>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#6C757D' }}>
                You will be redirected to PayFast to complete your payment securely.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelPurchase}
                className="button button-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="button button-primary"
                style={{ flex: 1, padding: '12px', backgroundColor: '#000000', color: '#FFFFFF' }}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 8. SETTINGS PANEL
// ============================================================================

export const SettingsPanel = () => {
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  const showLocalToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const setting = await getSetting('autoDeleteDays');
      if (setting) setAutoDeleteDays(setting.settingValue);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveSetting('autoDeleteDays', autoDeleteDays);
      showLocalToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showLocalToast('Failed to save settings', 'error');
    }
  };

  const handleAutoDeleteClick = () => {
    setDeleteConfirm(true);
  };

  const confirmAutoDelete = async () => {
    setDeleteConfirm(false);

    try {
      const deleted = await autoDeleteOldTranscriptions(autoDeleteDays);
      showLocalToast(`Deleted ${deleted.length} old transcriptions`, 'success');
    } catch (error) {
      console.error('Auto-delete failed:', error);
      showLocalToast('Failed to delete old transcriptions', 'error');
    }
  };

  const cancelAutoDelete = () => {
    setDeleteConfirm(false);
  };

  const handleExportData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        showLocalToast('Please sign in to export your data', 'error');
        return;
      }

      showLocalToast('Preparing data export...', 'info');
      await downloadUserData(user.id);
      showLocalToast('Data exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showLocalToast('Failed to export data', 'error');
    }
  };

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}><SpinnerIcon /></div>;
  }

  return (
    <div style={{ padding: '48px 32px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px', textTransform: 'uppercase' }}>
        Settings
      </h2>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Privacy Settings</h3>

        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px' }}>
          Auto-delete files after:
          <select
            value={autoDeleteDays}
            onChange={(e) => setAutoDeleteDays(Number(e.target.value))}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '8px',
              padding: '10px',
              border: '2px solid #E0E0E0',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days (recommended)</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
            <option value={0}>Never (manual cleanup required)</option>
          </select>
        </label>

        <button
          onClick={handleSave}
          className="button button-primary"
          style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#000000', color: '#FFFFFF' }}
        >
          Save Settings
        </button>

        <button
          onClick={handleAutoDeleteClick}
          className="button"
          style={{ marginTop: '16px', marginLeft: '12px', padding: '10px 20px', backgroundColor: '#6C757D', color: '#FFFFFF' }}
        >
          Delete Old Files Now
        </button>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Your Data Rights (POPIA)</h3>
        <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '16px' }}>
          You have the right to access and export all your data stored with us.
        </p>
        <button
          onClick={handleExportData}
          className="button"
          style={{ padding: '10px 20px', backgroundColor: '#17A2B8', color: '#FFFFFF' }}
        >
          Export My Data (JSON)
        </button>
      </div>

      <div style={{ padding: '24px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Your Privacy</h4>
        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#6C757D' }}>
          VCB AI complies with POPIA. We do not store your data on servers.
          All transcriptions remain on your local device only.
        </p>
      </div>

      {/* Auto-Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '32px',
            borderRadius: '8px',
            maxWidth: '450px',
            border: '2px solid #000000'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase' }}>
              Clean Up Old Files?
            </h2>
            <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              <p style={{ marginBottom: '12px' }}>
                This will delete all transcriptions older than <strong>{autoDeleteDays} days</strong>.
              </p>
              <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '12px' }}>
                This helps free up space and keeps your data organized.
              </p>
              <p style={{ fontSize: '13px', color: '#DC3545' }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelAutoDelete}
                className="button button-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAutoDelete}
                className="button"
                style={{ flex: 1, padding: '10px', backgroundColor: '#6C757D', color: '#FFFFFF', border: 'none' }}
              >
                Delete Old Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'success' ? '#28A745' : toast.type === 'error' ? '#DC3545' : '#17A2B8',
          color: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AUTHENTICATION WIDGET
// ============================================================================

export const AuthenticationWidget = ({ currentUser, onAuthChange }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    if (!showAccountMenu) return;

    const handleOutsideClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!currentUser) {
      setShowAccountMenu(false);
    }
  }, [currentUser]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user) {
        // Log session start and send notification
        try {
          let ipAddress = 'unknown';
          try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ipAddress = data.ip;
          } catch (ipError) {
            console.log('Could not fetch IP for email notification:', ipError);
          }

          await logSessionStart(session.user.id, session.user.email);
          console.log('Session start logged for user:', session.user.email);

          await sendLoginNotification(session.user.id, session.user.email, ipAddress, navigator.userAgent);
          console.log('Login notification sent to:', session.user.email);
        } catch (logError) {
          console.error('Failed to log session start or send notification:', logError);
        }

        // Clear form and close modal
        setEmail('');
        setPassword('');
        setIsAuthOpen(false);
        setError(null);
        setMessage('Signed in successfully!');

        // Notify parent component
        if (onAuthChange) onAuthChange(session.user);
      } else if (event === 'SIGNED_OUT') {
        if (onAuthChange) onAuthChange(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthChange]);

  const iconButtonStyle = {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { user } = await signUp(email, password);
      setMessage('Account created! Please check your email to verify your account.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await signIn(email, password);
      // Auth state change handler will take care of the rest
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setShowAccountMenu(false);

    // Log session end before signing out
    if (currentUser) {
      try {
        await logSessionEnd(currentUser.id);
        console.log('Session end logged for user:', currentUser.email);
      } catch (logError) {
        console.error('Failed to log session end:', logError);
      }
    }

    try {
      await signOut();
      // Auth state change handler will update the UI
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in, show account menu
  if (currentUser) {
    return (
      <div ref={accountMenuRef} style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        fontFamily: 'Quicksand, sans-serif'
      }}>
        <button
          type="button"
          onClick={() => setShowAccountMenu((prev) => !prev)}
          title={currentUser.email}
          style={{
            ...iconButtonStyle,
            backgroundColor: showAccountMenu ? '#000000' : '#FFFFFF',
            color: showAccountMenu ? '#FFFFFF' : '#000000'
          }}
        >
          <UserCircleIcon />
        </button>

        {showAccountMenu && (
          <div style={{
            position: 'absolute',
            top: '52px',
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '16px',
            width: '240px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              wordBreak: 'break-all'
            }}>
              {currentUser.email}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6C757D',
              marginBottom: '16px'
            }}>
              Signed in to VCB AI
            </div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer'
              }}
            >
              {loading ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // If user is not logged in, show sign in button
  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
      {!isAuthOpen && (
        <button
          type="button"
          onClick={() => setIsAuthOpen(true)}
          title="Sign in to VCB AI"
          style={{
            ...iconButtonStyle,
            backgroundColor: '#000000',
            color: '#FFFFFF'
          }}
        >
          <UserCircleIcon />
        </button>
      )}

      {isAuthOpen && (
        <div style={{
          position: 'relative',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 9999,
          width: '340px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h3>
            <button
              onClick={() => setIsAuthOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #DDD',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'Quicksand, sans-serif'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #DDD',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'Quicksand, sans-serif'
                }}
              />
              {authMode === 'signup' && (
                <div style={{ fontSize: '12px', color: '#6C757D', marginTop: '4px' }}>
                  Minimum 6 characters
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#FEE',
                color: '#C33',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
                border: '1px solid #FDD'
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#DFD',
                color: '#363',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
                border: '1px solid #CEC'
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: loading ? 'wait' : 'pointer',
                fontWeight: 600,
                fontFamily: 'Quicksand, sans-serif'
              }}
            >
              {loading ? 'Please wait...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '13px'
          }}>
            {authMode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                    setMessage(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#000',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '13px',
                    fontFamily: 'Quicksand, sans-serif'
                  }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setMessage(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#000',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '13px',
                    fontFamily: 'Quicksand, sans-serif'
                  }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#F8F9FA',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#6C757D',
            lineHeight: '1.5'
          }}>
            <strong>Privacy:</strong> Your transcriptions are stored locally. We use auth only for token sync.
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT ALL COMPONENTS
// ============================================================================

export default {
  TranslationSelector,
  VoiceSynthesisOptions,
  TokenBalanceWidget,
  CostEstimator,
  HistoryDashboard,
  POPIAWarningModal,
  TokenPurchasePage,
  SettingsPanel,
  AuthenticationWidget
};
