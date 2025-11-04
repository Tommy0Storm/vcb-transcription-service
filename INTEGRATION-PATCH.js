/**
 * VCB TRANSCRIPTION SERVICE - INTEGRATION PATCH
 *
 * This file contains all the code additions needed to integrate
 * the enhanced features into vcb-transcription-service.jsx
 *
 * INSTRUCTIONS:
 * 1. Add the imports at the top of your file
 * 2. Add the enhanced functions before the VCBTranscriptionService component
 * 3. Add the state variables inside the component
 * 4. Add the handlers inside the component
 * 5. Add the UI components in the return statement
 *
 * @version 2.0
 * @author VCB AI
 */

// ============================================================================
// PART 1: ADD THESE IMPORTS AT THE TOP OF vcb-transcription-service.jsx
// (After the existing imports around line 7)
// ============================================================================

/*
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
  saveTranscription,
  getTranscriptionHistory,
  deleteTranscription,
  autoDeleteOldTranscriptions,
  initializeDatabase,
  saveSetting,
  getSetting,
  downloadBlob,
  parseTranscriptSegments,
  generateHighCourtDocument
} from './vcb-features-enhanced';
*/

// ============================================================================
// PART 2: ADD THESE HELPER FUNCTIONS BEFORE VCBTranscriptionService COMPONENT
// (Around line 500, after createStandardFooter function)
// ============================================================================

const getAudioDuration = (file) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      resolve({
        minutes,
        seconds,
        total: audio.duration,
        formatted: `${minutes}:${String(seconds).padStart(2, '0')}`
      });
    });
    audio.addEventListener('error', reject);
    audio.src = URL.createObjectURL(file);
  });
};

// ============================================================================
// PART 3: ADD THESE STATE VARIABLES INSIDE VCBTranscriptionService
// (Around line 1342, after existing state declarations)
// ============================================================================

const [selectedTranslation, setSelectedTranslation] = useState({});
const [voiceOptions, setVoiceOptions] = useState({});
const [tokenBalance, setTokenBalance] = useState(null);
const [showHistory, setShowHistory] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [showBuyTokens, setShowBuyTokens] = useState(false);
const [refreshTokens, setRefreshTokens] = useState(0);
const [showPOPIAModal, setShowPOPIAModal] = useState(false);

// ============================================================================
// PART 4: ADD THESE EFFECTS INSIDE VCBTranscriptionService
// (Around line 1410, after existing useEffect hooks)
// ============================================================================

// Initialize IndexedDB on mount
useEffect(() => {
    initializeDatabase().catch(err => {
        console.error('Failed to initialize database:', err);
    });
}, []);

// Load token balance
useEffect(() => {
    const loadBalance = async () => {
        try {
            const balance = await getTokenBalance();
            setTokenBalance(balance);
        } catch (error) {
            console.error('Failed to load token balance:', error);
        }
    };
    loadBalance();
}, [refreshTokens]);

// Check POPIA warning on mount
useEffect(() => {
    const seen = localStorage.getItem('vcb-popia-warning-seen');
    if (!seen) {
        setShowPOPIAModal(true);
    }
}, []);

// Auto-delete old transcriptions on mount
useEffect(() => {
    const autoDelete = async () => {
        try {
            const setting = await getSetting('autoDeleteDays');
            const days = setting?.settingValue || 30;
            const deleted = await autoDeleteOldTranscriptions(days);
            if (deleted.length > 0) {
                console.log(`Auto-deleted ${deleted.length} old transcriptions`);
            }
        } catch (error) {
            console.error('Auto-delete failed:', error);
        }
    };
    autoDelete();
}, []);

// ============================================================================
// PART 5: ADD THESE HANDLER FUNCTIONS INSIDE VCBTranscriptionService
// (Around line 2054, before exportTranscription function)
// ============================================================================

const handleTranslation = async (fileId, targetLanguageCode) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.result?.transcriptText) {
        showToast('Transcription not available for translation', 'error');
        return;
    }

    updateFile(fileId, {
        result: { ...file.result, isTranslating: true, translationProgress: 0 }
    });

    try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

        // Simulate progress
        const progressInterval = setInterval(() => {
            setFiles(prevFiles => prevFiles.map(f => {
                if (f.id === fileId && f.result?.isTranslating) {
                    const currentProgress = f.result.translationProgress || 0;
                    return {
                        ...f,
                        result: {
                            ...f.result,
                            translationProgress: Math.min(currentProgress + 10, 90)
                        }
                    };
                }
                return f;
            }));
        }, 500);

        const translatedText = await translateTranscript(
            file.result.transcriptText,
            targetLanguageCode,
            apiKey
        );

        clearInterval(progressInterval);

        const language = [...LANGUAGES.official, ...LANGUAGES.foreign].find(
            lang => lang.code === targetLanguageCode
        );

        updateFile(fileId, {
            result: {
                ...file.result,
                isTranslating: false,
                translationProgress: 100,
                translationText: translatedText,
                targetLanguage: language?.name || 'Unknown',
                targetLanguageCode: targetLanguageCode
            }
        });

        setSelectedTranslation(prev => ({ ...prev, [fileId]: targetLanguageCode }));
        showToast('Translation completed successfully!', 'info');
    } catch (error) {
        console.error('Translation failed:', error);
        updateFile(fileId, {
            result: { ...file.result, isTranslating: false, translationProgress: 0 }
        });
        showToast(`Translation failed: ${error.message}`, 'error');
    }
};

const handleVoiceSynthesis = async (fileId, voiceConfig) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.result?.transcriptText) {
        showToast('Transcription not available for voice synthesis', 'error');
        return;
    }

    updateFile(fileId, {
        result: { ...file.result, isGeneratingVoice: true, voiceProgress: 0 }
    });

    try {
        // Simulate progress
        const progressInterval = setInterval(() => {
            setFiles(prevFiles => prevFiles.map(f => {
                if (f.id === fileId && f.result?.isGeneratingVoice) {
                    const currentProgress = f.result.voiceProgress || 0;
                    return {
                        ...f,
                        result: {
                            ...f.result,
                            voiceProgress: Math.min(currentProgress + 8, 90)
                        }
                    };
                }
                return f;
            }));
        }, 600);

        const segments = parseTranscriptSegments(file.result.transcriptText);
        const audioBlob = await generateVoiceNarration(
            segments,
            voiceConfig.speakerVoices,
            voiceConfig.isWaveNet
        );

        clearInterval(progressInterval);

        updateFile(fileId, {
            result: {
                ...file.result,
                isGeneratingVoice: false,
                voiceProgress: 100,
                voiceBlob: audioBlob,
                voiceQuality: voiceConfig.isWaveNet ? 'wavenet' : 'standard',
                speakerVoices: voiceConfig.speakerVoices
            }
        });

        setVoiceOptions(prev => ({ ...prev, [fileId]: voiceConfig }));
        showToast('Voice narration generated! (Framework ready - Google Cloud TTS required for production)', 'info');
    } catch (error) {
        console.error('Voice synthesis failed:', error);
        updateFile(fileId, {
            result: { ...file.result, isGeneratingVoice: false, voiceProgress: 0 }
        });
        showToast(`Voice synthesis failed: ${error.message}`, 'error');
    }
};

const exportWithTokens = async (fileId, templateType = 'PROFESSIONAL') => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.result) {
        showToast('No transcription available', 'error');
        return;
    }

    try {
        // Calculate duration
        const audioDuration = await getAudioDuration(file.file);
        const audioMinutes = audioDuration.minutes + (audioDuration.seconds / 60);

        // Calculate cost
        const cost = calculateServiceCost(audioMinutes, {
            translation: !!file.result.translationText,
            voiceSynthesis: !!file.result.voiceBlob,
            voiceQuality: file.result.voiceQuality || 'standard'
        });

        // Check token balance
        const balance = await getTokenBalance();
        if (balance.tokensRemaining < cost.tokens) {
            const buyTokens = confirm(
                `Insufficient tokens!\n\nYou need ${cost.tokens} tokens but only have ${balance.tokensRemaining}.\n\nWould you like to buy more tokens?`
            );
            if (buyTokens) {
                setShowBuyTokens(true);
            }
            return;
        }

        // Confirm cost
        const proceed = confirm(
            `This will use ${cost.tokens} tokens (R ${cost.costInRands}).\n\nBreakdown:\n` +
            `- Transcription: R ${cost.breakdown.transcription}\n` +
            (file.result.translationText ? `- Translation: R ${cost.breakdown.translation}\n` : '') +
            (file.result.voiceBlob ? `- Voice: R ${cost.breakdown.voiceSynthesis}\n` : '') +
            `\nProceed with export?`
        );

        if (!proceed) return;

        // Generate document
        let doc;
        let filename;

        if (file.result.translationText) {
            // Bilingual document
            doc = generateBilingualDocument(
                file.result.transcriptText,
                file.result.translationText,
                {
                    sourceLanguage: 'English',
                    targetLanguage: file.result.targetLanguage,
                    duration: audioDuration.formatted,
                    fileName: file.name
                }
            );
            filename = `${file.name.replace(/\.[^/.]+$/, "")}_Bilingual.docx`;
        } else if (templateType === 'HIGH_COURT') {
            // High Court document
            doc = generateHighCourtDocument(file.result.transcriptText, {
                caseNumber: prompt('Enter Case Number (optional):') || 'TBD',
                caseName: prompt('Enter Case Name (optional):') || 'TBD',
                division: prompt('Enter Division (optional):') || 'TBD',
                hearingDate: new Date().toLocaleDateString(),
                judge: prompt('Enter Judge Name (optional):') || 'TBD',
                status: 'DRAFT'
            });
            filename = `${file.name.replace(/\.[^/.]+$/, "")}_HighCourt.docx`;
        } else {
            // Use existing standard document generation
            const docResult = file.result.processingTier === 'Legal'
                ? generateLegalDoc(file.result)
                : generateStandardTranscriptDoc(file.result);
            doc = docResult;
            filename = `${file.name.replace(/\.[^/.]+$/, "")}_Transcript.docx`;
        }

        // Convert to blob and download
        const { Packer } = await import('docx');
        const blob = await Packer.toBlob(doc);
        downloadBlob(blob, filename);

        // Download voice file if available
        if (file.result.voiceBlob) {
            const voiceFilename = `${file.name.replace(/\.[^/.]+$/, "")}_Voice.mp3`;
            downloadBlob(file.result.voiceBlob, voiceFilename);
        }

        // Deduct tokens
        await deductTokens(cost.tokens, `Transcription: ${file.name}`);
        setRefreshTokens(prev => prev + 1);

        showToast(
            `✅ Export successful!\n${cost.tokens} tokens deducted.\nRemaining: ${balance.tokensRemaining - cost.tokens} tokens`,
            'info'
        );

        // Save to history
        await saveTranscription({
            fileName: file.name,
            fileSize: file.size,
            duration: audioDuration.formatted,
            sourceLanguage: 'English',
            targetLanguage: file.result.targetLanguage || null,
            transcriptText: file.result.transcriptText,
            translationText: file.result.translationText || null,
            templateType,
            documentBlob: blob,
            audioBlob: file.result.voiceBlob || null,
            tokensCost: cost.tokens
        });

    } catch (error) {
        console.error('Export failed:', error);
        showToast(`Export failed: ${error.message}`, 'error');
    }
};

const handlePOPIAAccept = () => {
    localStorage.setItem('vcb-popia-warning-seen', 'true');
    setShowPOPIAModal(false);
};

// ============================================================================
// PART 6: ADD THESE UI COMPONENTS IN THE RETURN STATEMENT
// (Replace or augment the existing return statement around line 2126)
// ============================================================================

/**
 * INTEGRATION INSTRUCTIONS FOR UI:
 *
 * 1. Add POPIA Modal at the very top (before everything else)
 * 2. Add Token Balance Widget (fixed position top-right)
 * 3. Add Navigation Tabs
 * 4. Add conditional rendering for History/Settings/Buy Tokens pages
 * 5. Enhance the ResultCard with Translation and Voice options
 */

// Add this BEFORE the main return statement content:

if (showPOPIAModal) {
    return <POPIAWarningModal onAccept={handlePOPIAAccept} />;
}

// ============================================================================
// PART 7: COMPLETE ENHANCED COMPONENT STRUCTURE
// ============================================================================

/**
 * This is the complete enhanced component structure.
 * Integrate this into your existing return statement.
 */

const EnhancedUI = () => (
    <div style={{ position: 'relative' }}>
        {/* Token Balance Widget - Fixed Top Right */}
        <TokenBalanceWidget onRefresh={refreshTokens} />

        {/* Navigation */}
        <nav style={{
            display: 'flex',
            gap: '24px',
            padding: '20px',
            borderBottom: '2px solid #E0E0E0',
            marginBottom: '32px'
        }}>
            <button
                onClick={() => {
                    setShowHistory(false);
                    setShowSettings(false);
                    setShowBuyTokens(false);
                }}
                style={{
                    background: !showHistory && !showSettings && !showBuyTokens ? '#000000' : 'transparent',
                    color: !showHistory && !showSettings && !showBuyTokens ? '#FFFFFF' : '#000000',
                    border: 'none',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    textTransform: 'uppercase'
                }}
            >
                Transcribe
            </button>
            <button
                onClick={() => {
                    setShowHistory(true);
                    setShowSettings(false);
                    setShowBuyTokens(false);
                }}
                style={{
                    background: showHistory ? '#000000' : 'transparent',
                    color: showHistory ? '#FFFFFF' : '#000000',
                    border: 'none',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    textTransform: 'uppercase'
                }}
            >
                History
            </button>
            <button
                onClick={() => {
                    setShowHistory(false);
                    setShowSettings(false);
                    setShowBuyTokens(true);
                }}
                style={{
                    background: showBuyTokens ? '#000000' : 'transparent',
                    color: showBuyTokens ? '#FFFFFF' : '#000000',
                    border: 'none',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    textTransform: 'uppercase'
                }}
            >
                Buy Tokens
            </button>
            <button
                onClick={() => {
                    setShowHistory(false);
                    setShowSettings(true);
                    setShowBuyTokens(false);
                }}
                style={{
                    background: showSettings ? '#000000' : 'transparent',
                    color: showSettings ? '#FFFFFF' : '#000000',
                    border: 'none',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontFamily: 'Quicksand, sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    textTransform: 'uppercase'
                }}
            >
                Settings
            </button>
        </nav>

        {/* Conditional Page Rendering */}
        {showHistory && <HistoryDashboard />}
        {showSettings && <SettingsPanel />}
        {showBuyTokens && <TokenPurchasePage />}

        {/* Main Transcription UI (when not showing other pages) */}
        {!showHistory && !showSettings && !showBuyTokens && (
            <div>{/* Your existing transcription UI here */}</div>
        )}
    </div>
);

// ============================================================================
// PART 8: ENHANCED RESULT CARD WITH TRANSLATION & VOICE OPTIONS
// ============================================================================

/**
 * Add these sections to your ResultCard component
 * (Inside the ResultCard, after the transcription display)
 */

const EnhancedResultCardAdditions = ({ file, fileId }) => (
    <>
        {/* Translation Selector */}
        {file.result && !file.result.isTranslating && (
            <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
                    Add Translation (Optional)
                </h4>
                <select
                    value={selectedTranslation[fileId] || ''}
                    onChange={(e) => {
                        const langCode = e.target.value;
                        if (langCode) {
                            handleTranslation(fileId, langCode);
                        }
                    }}
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
        )}

        {/* Translation Progress */}
        {file.result?.isTranslating && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <SpinnerIcon />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Translating...</span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${file.result.translationProgress || 0}%`,
                        height: '100%',
                        backgroundColor: '#000000',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
        )}

        {/* Translation Result */}
        {file.result?.translationText && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: '6px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#166534' }}>
                    ✓ Translation Complete ({file.result.targetLanguage})
                </h5>
                <details>
                    <summary style={{ cursor: 'pointer', fontSize: '13px' }}>View translated text</summary>
                    <div style={{ marginTop: '12px', fontSize: '13px', lineHeight: '1.6', maxHeight: '200px', overflow: 'auto' }}>
                        {file.result.translationText}
                    </div>
                </details>
            </div>
        )}

        {/* Voice Synthesis Options */}
        {file.result && !file.result.isGeneratingVoice && !file.result.voiceBlob && (
            <VoiceSynthesisOptions
                transcript={file.result.transcriptText}
                onVoiceGenerate={(voiceConfig) => handleVoiceSynthesis(fileId, voiceConfig)}
                disabled={false}
            />
        )}

        {/* Voice Generation Progress */}
        {file.result?.isGeneratingVoice && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <SpinnerIcon />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Generating Voice...</span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${file.result.voiceProgress || 0}%`,
                        height: '100%',
                        backgroundColor: '#000000',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
        )}

        {/* Voice Result */}
        {file.result?.voiceBlob && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: '6px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#166534' }}>
                    ✓ Voice Narration Ready ({file.result.voiceQuality === 'wavenet' ? 'Premium' : 'Standard'})
                </h5>
                <p style={{ fontSize: '12px', color: '#6C757D' }}>
                    Voice file will be included in export
                </p>
            </div>
        )}

        {/* Cost Estimator */}
        {file.result && (
            <CostEstimator
                audioMinutes={file.duration || 30} // Use actual duration
                options={{
                    translation: !!file.result.translationText,
                    voiceSynthesis: !!file.result.voiceBlob,
                    voiceQuality: file.result.voiceQuality
                }}
            />
        )}

        {/* Enhanced Export Buttons */}
        {file.result && (
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => exportWithTokens(fileId, 'PROFESSIONAL')}
                    className="button button-primary"
                    style={{ padding: '12px 24px' }}
                >
                    <ExportIcon /> Export Professional Document
                </button>
                <button
                    onClick={() => exportWithTokens(fileId, 'HIGH_COURT')}
                    className="button button-secondary"
                    style={{ padding: '12px 24px' }}
                >
                    <ExportIcon /> Export High Court Document
                </button>
            </div>
        )}
    </>
);

// ============================================================================
// PART 9: COMPONENT IMPORTS FOR UI
// ============================================================================

/**
 * Import these UI components from vcb-components-enhanced.jsx
 * (Add to imports at top of file)
 */

/*
import {
  TranslationSelector,
  VoiceSynthesisOptions,
  TokenBalanceWidget,
  CostEstimator,
  HistoryDashboard,
  POPIAWarningModal,
  TokenPurchasePage,
  SettingsPanel
} from './vcb-components-enhanced';
*/

// ============================================================================
// INTEGRATION COMPLETE
// ============================================================================

/**
 * SUMMARY OF CHANGES:
 *
 * 1. Added imports for enhanced features and components
 * 2. Added state variables for translation, voice, tokens
 * 3. Added useEffect hooks for database init and token loading
 * 4. Added handlers for translation, voice synthesis, and token-based export
 * 5. Added navigation for History, Settings, Buy Tokens
 * 6. Enhanced ResultCard with translation and voice options
 * 7. Added POPIA warning modal
 * 8. Added cost estimator before export
 *
 * TESTING:
 * - Test translation for all 11 SA languages
 * - Test voice synthesis (framework ready)
 * - Test token deduction after successful export
 * - Test history dashboard
 * - Test settings panel
 * - Test POPIA modal on first visit
 * - Test token purchase flow (PayFast sandbox)
 *
 * DEPLOYMENT:
 * - Set environment variables (API keys)
 * - Switch PayFast to production mode
 * - Deploy to Vercel/Netlify
 * - Test all features in production
 */

export default null; // This is a patch file, not a module
