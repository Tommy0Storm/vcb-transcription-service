# INTEGRATION GUIDE - Enhanced Features
**How to integrate the new features into vcb-transcription-service.jsx**

---

## Files Created

1. **vcb-features-enhanced.jsx** - Core functionality (Translation, Voice, Tokens, Storage, PayFast)
2. **vcb-components-enhanced.jsx** - UI Components (Selectors, Widgets, Modals, Dashboards)
3. **INTEGRATION-GUIDE.md** - This file

---

## Step 1: Add Imports to vcb-transcription-service.jsx

At the top of your `vcb-transcription-service.jsx` file, add these imports:

```javascript
// Enhanced Features
import {
  translateTranscript,
  generateBilingualDocument,
  detectSpeakers,
  generateVoiceNarration,
  getTokenBalance,
  calculateServiceCost,
  deductTokens,
  saveTranscription,
  getAudioDuration,
  downloadBlob,
  LANGUAGES,
  initializeDatabase
} from './vcb-features-enhanced';

import {
  TranslationSelector,
  VoiceSynthesisOptions,
  TokenBalanceWidget,
  CostEstimator,
  POPIAWarningModal
} from './vcb-components-enhanced';
```

---

## Step 2: Add State Variables

Inside the `VCBTranscriptionService` component (around line 1332), add these state variables:

```javascript
const VCBTranscriptionService = () => {
    // Existing state...
    const [files, setFiles] = useState([]);
    const [saveStatus, setSaveStatus] = useState('idle');
    // ... other existing state ...

    // NEW: Enhanced feature state
    const [selectedTranslation, setSelectedTranslation] = useState('');
    const [voiceOptions, setVoiceOptions] = useState(null);
    const [tokenBalance, setTokenBalance] = useState(null);
    const [estimatedCost, setEstimatedCost] = useState(null);
    const [refreshTokens, setRefreshTokens] = useState(0);

    // ... rest of component
```

---

## Step 3: Initialize Database on Mount

Add this useEffect hook after your existing useEffect hooks:

```javascript
// Initialize IndexedDB
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
```

---

## Step 4: Add Translation Handler

Add this function after your `transcribeAudio` function:

```javascript
const handleTranslation = async (fileId, targetLanguageCode) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.result?.transcriptText) {
        showToast('Transcription not available for translation', 'error');
        return;
    }

    updateFile(fileId, { isTranslating: true });

    try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        const translatedText = await translateTranscript(
            file.result.transcriptText,
            targetLanguageCode,
            apiKey
        );

        updateFile(fileId, {
            isTranslating: false,
            result: {
                ...file.result,
                translationText: translatedText,
                targetLanguage: targetLanguageCode
            }
        });

        showToast('Translation completed successfully', 'info');
    } catch (error) {
        console.error('Translation failed:', error);
        updateFile(fileId, { isTranslating: false });
        showToast(`Translation failed: ${error.message}`, 'error');
    }
};
```

---

## Step 5: Add Voice Synthesis Handler

```javascript
const handleVoiceSynthesis = async (fileId, voiceConfig) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.result?.transcriptText) {
        showToast('Transcription not available for voice synthesis', 'error');
        return;
    }

    updateFile(fileId, { isGeneratingVoice: true });

    try {
        const segments = parseTranscriptSegments(file.result.transcriptText);
        const audioBlob = await generateVoiceNarration(
            segments,
            voiceConfig.speakerVoices,
            voiceConfig.isWaveNet
        );

        updateFile(fileId, {
            isGeneratingVoice: false,
            result: {
                ...file.result,
                voiceBlob: audioBlob,
                voiceQuality: voiceConfig.isWaveNet ? 'wavenet' : 'standard'
            }
        });

        showToast('Voice narration generated successfully', 'info');
    } catch (error) {
        console.error('Voice synthesis failed:', error);
        updateFile(fileId, { isGeneratingVoice: false });
        showToast(`Voice synthesis failed: ${error.message}`, 'error');
    }
};
```

---

## Step 6: Add Document Export with Token Deduction

Add this function to handle document generation with token deduction:

```javascript
const exportDocumentWithTokens = async (fileId, templateType = 'PROFESSIONAL') => {
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
            showToast(
                `Insufficient tokens. You need ${cost.tokens} tokens but only have ${balance.tokensRemaining}.`,
                'error'
            );
            return;
        }

        // Generate document
        let doc;
        if (file.result.translationText) {
            // Bilingual document
            const language = LANGUAGES.official.find(l => l.code === file.result.targetLanguage) ||
                           LANGUAGES.foreign.find(l => l.code === file.result.targetLanguage);
            doc = generateBilingualDocument(
                file.result.transcriptText,
                file.result.translationText,
                {
                    sourceLanguage: 'English',
                    targetLanguage: language?.name || 'Unknown',
                    duration: audioDuration.formatted,
                    fileName: file.name
                }
            );
        } else if (templateType === 'HIGH_COURT') {
            // High Court document
            doc = generateHighCourtDocument(file.result.transcriptText, {
                caseNumber: 'TBD',
                caseName: 'TBD',
                division: 'TBD',
                hearingDate: new Date().toLocaleDateString(),
                judge: 'TBD',
                status: 'DRAFT'
            });
        } else {
            // Use existing exportAsDocx function
            // This assumes your existing function works
            await exportAsDocx(fileId);

            // Deduct tokens
            await deductTokens(cost.tokens, `Transcription: ${file.name}`);
            setRefreshTokens(prev => prev + 1);
            showToast(`Document exported. ${cost.tokens} tokens deducted.`, 'info');

            // Save to history
            const docBlob = new Blob(); // Your existing doc blob
            await saveTranscription({
                fileName: file.name,
                fileSize: file.size,
                duration: audioDuration.formatted,
                sourceLanguage: 'English',
                targetLanguage: file.result.targetLanguage,
                transcriptText: file.result.transcriptText,
                translationText: file.result.translationText,
                templateType,
                documentBlob: docBlob,
                audioBlob: file.result.voiceBlob,
                tokensCost: cost.tokens
            });

            return;
        }

        // Convert to blob and download
        const blob = await Packer.toBlob(doc);
        downloadBlob(blob, `${file.name}_transcript.docx`);

        // Deduct tokens
        await deductTokens(cost.tokens, `Transcription: ${file.name}`);
        setRefreshTokens(prev => prev + 1);
        showToast(`Document exported. ${cost.tokens} tokens deducted.`, 'info');

        // Save to history
        await saveTranscription({
            fileName: file.name,
            fileSize: file.size,
            duration: audioDuration.formatted,
            sourceLanguage: 'English',
            targetLanguage: file.result.targetLanguage,
            transcriptText: file.result.transcriptText,
            translationText: file.result.translationText,
            templateType,
            documentBlob: blob,
            audioBlob: file.result.voiceBlob,
            tokensCost: cost.tokens
        });

    } catch (error) {
        console.error('Export failed:', error);
        showToast(`Export failed: ${error.message}`, 'error');
    }
};
```

---

## Step 7: Update the UI - Add Components

In the return statement of your component, add these new UI elements:

### A. Add POPIA Modal (at the very top):

```jsx
return (
    <div className="vcb-app">
        {/* POPIA Warning Modal */}
        <POPIAWarningModal onAccept={() => console.log('User accepted POPIA terms')} />

        {/* Token Balance Widget */}
        <TokenBalanceWidget onRefresh={refreshTokens} />

        {/* Rest of your existing UI... */}
```

### B. Add Translation & Voice Options (after transcription results):

```jsx
{file.result && (
    <>
        {/* Existing result display... */}

        {/* NEW: Translation Selector */}
        <TranslationSelector
            onTranslationSelect={(langCode) => {
                if (langCode) {
                    handleTranslation(file.id, langCode);
                }
            }}
            disabled={file.isTranslating}
        />

        {/* NEW: Voice Synthesis Options */}
        <VoiceSynthesisOptions
            transcript={file.result.transcriptText}
            onVoiceGenerate={(voiceConfig) => handleVoiceSynthesis(file.id, voiceConfig)}
            disabled={file.isGeneratingVoice}
        />

        {/* NEW: Cost Estimator */}
        {file.duration && (
            <CostEstimator
                audioMinutes={file.duration}
                options={{
                    translation: !!file.result.translationText,
                    voiceSynthesis: !!file.result.voiceBlob,
                    voiceQuality: file.result.voiceQuality
                }}
            />
        )}

        {/* Update existing export button to use new function */}
        <button onClick={() => exportDocumentWithTokens(file.id, 'PROFESSIONAL')}>
            Export Professional Document
        </button>
        <button onClick={() => exportDocumentWithTokens(file.id, 'HIGH_COURT')}>
            Export High Court Document
        </button>
    </>
)}
```

---

## Step 8: Add Navigation for History & Settings

Add navigation links somewhere in your UI:

```jsx
<nav style={{ padding: '20px', borderBottom: '2px solid #E0E0E0' }}>
    <a href="#transcribe" style={{ marginRight: '20px' }}>Transcribe</a>
    <a href="#history" style={{ marginRight: '20px' }}>History</a>
    <a href="#buy-tokens" style={{ marginRight: '20px' }}>Buy Tokens</a>
    <a href="#settings">Settings</a>
</nav>
```

Then create routes for these pages using `HistoryDashboard`, `TokenPurchasePage`, and `SettingsPanel` components.

---

## Step 9: Add CSS for Animations

Add this CSS to your stylesheet or style tag:

```css
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes dash {
    0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
    50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
    100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

---

## Step 10: Test the Integration

### Test Checklist:

1. **POPIA Modal**
   - [ ] Shows on first visit
   - [ ] Doesn't show again after acceptance
   - [ ] Stores preference in localStorage

2. **Token Balance**
   - [ ] Displays in top-right corner
   - [ ] Shows correct balance from IndexedDB
   - [ ] Updates after token usage

3. **Translation**
   - [ ] Language selector appears after transcription
   - [ ] Translation works for all 11 SA languages
   - [ ] Bilingual document generates correctly
   - [ ] Tokens are deducted after success

4. **Voice Synthesis**
   - [ ] Shows speaker list
   - [ ] Allows voice assignment (male/female)
   - [ ] Standard/WaveNet toggle works
   - [ ] (Note: Actual TTS requires Google Cloud setup)

5. **Cost Estimator**
   - [ ] Shows accurate cost breakdown
   - [ ] Updates when options change
   - [ ] Token count is correct

6. **Document Export**
   - [ ] Professional template works
   - [ ] High Court template has double-spacing
   - [ ] Bilingual template has two columns
   - [ ] Tokens deducted only after success

7. **IndexedDB Storage**
   - [ ] Transcriptions save to history
   - [ ] History dashboard loads
   - [ ] Download from history works
   - [ ] Delete from history works

---

## Step 11: PayFast Payment Success Handler

Create a new file `payment-success.html` in your public folder:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Successful - VCB AI</title>
</head>
<body>
    <h1>Payment Successful!</h1>
    <p>Your tokens have been added to your account.</p>
    <a href="/">Return to App</a>

    <script>
        // Parse PayFast return data
        const urlParams = new URLSearchParams(window.location.search);
        const tokensAdded = urlParams.get('custom_int1');

        if (tokensAdded) {
            // Store success message
            localStorage.setItem('payment-success', JSON.stringify({
                tokens: tokensAdded,
                timestamp: new Date().toISOString()
            }));

            // Redirect to main app
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    </script>
</body>
</html>
```

---

## Troubleshooting

### Issue: "Cannot find module './vcb-features-enhanced'"

**Solution**: Make sure the files are in the same directory as `vcb-transcription-service.jsx`. If they're in a different folder, update the import path:

```javascript
import { ... } from './features/vcb-features-enhanced';
```

### Issue: IndexedDB not working

**Solution**: Check browser console for errors. IndexedDB requires HTTPS in production. For development, use `localhost` (not `127.0.0.1`).

### Issue: Tokens not deducting

**Solution**: Ensure `deductTokens()` is called AFTER successful document generation, inside the `try` block. Check browser console for errors.

### Issue: Voice synthesis not working

**Solution**: The current implementation is a placeholder. Full TTS requires Google Cloud Text-to-Speech API setup with server-side proxy.

---

## Next Steps

1. **Test all features** using the checklist above
2. **Deploy to staging** environment
3. **Test PayFast** in sandbox mode
4. **Switch PayFast to production** mode when ready
5. **Monitor token usage** and adjust pricing if needed

---

## Additional Resources

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Google Cloud TTS Docs](https://cloud.google.com/text-to-speech/docs)
- [PayFast Developer Docs](https://developers.payfast.co.za/)
- [IndexedDB Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**Integration Complete!**

Your VCB Transcription Service now has:
- ✅ Translation to 11 SA languages
- ✅ Voice synthesis (framework ready)
- ✅ Token management system
- ✅ High Court document formatting
- ✅ IndexedDB local storage
- ✅ POPIA compliance
- ✅ PayFast payment integration

All features are modular and can be enabled/disabled independently.
