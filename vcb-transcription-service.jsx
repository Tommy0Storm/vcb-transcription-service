

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageNumber, Header as DocxHeader, Footer, Table, TableRow, TableCell, WidthType, VerticalAlign, PageBreak, BorderStyle } from 'docx';

// --- HELPERS & CONSTANTS ---

const fileToBase64WithProgress = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const generateWaveformData = async (file) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200; // Number of data points for the waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[blockStart + j]);
            }
            filteredData.push(sum / blockSize);
        }
        const max = Math.max(...filteredData);
        return filteredData.map(d => d / max);
    } catch (e) {
        console.error("Error generating waveform:", e);
        return [];
    }
};

const decodePCMAudioData = async (pcmData, audioContext) => {
    const sampleRate = 24000;
    const numChannels = 1;
    const pcm16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
    const frameCount = pcm16.length / numChannels;
    const audioBuffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = pcm16[i] / 32768.0;
    }
    return audioBuffer;
};

const generateSerialNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const randomPart1 = Math.random().toString(36).substring(2, 7).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `VCB-${year}${month}${day}-${randomPart1}-${randomPart2}`;
};

const OFFICIAL_LANGUAGES = ['Afrikaans', 'isiNdebele', 'isiXhosa', 'isiZulu', 'Sepedi', 'Sesotho', 'Setswana', 'siSwati', 'Tshivenḓa', 'Xitsonga'];
const LOCAL_STORAGE_KEY = 'vcbTranscriptionSession_enterprise_v4_premium';
const MALE_VOICES = ['Puck', 'Fenrir', 'Zephyr'];
const FEMALE_VOICES = ['Kore', 'Charon'];
const GEMINI_FILE_SIZE_LIMIT_MB = 32;
const MAX_FILES_PER_BATCH = 10;

// --- ERROR HANDLING HELPERS ---

const categorizeError = (error) => {
    const message = error?.message || String(error);

    // API Key errors
    if (message.includes('API_KEY') || message.includes('API key') || message.includes('authentication')) {
        return {
            type: 'auth',
            userMessage: 'API key is missing or invalid. Please check your .env.local file.',
            suggestion: 'Verify that GEMINI_API_KEY is correctly set in your environment configuration.',
            canRetry: false
        };
    }

    // Rate limiting errors
    if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
        return {
            type: 'rate_limit',
            userMessage: 'API rate limit exceeded. Please wait a moment before trying again.',
            suggestion: 'The system has made too many requests. Wait 60 seconds and retry.',
            canRetry: true,
            retryAfter: 60000
        };
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch failed') || message.includes('ECONNREFUSED') || message.includes('timeout')) {
        return {
            type: 'network',
            userMessage: 'Network connection failed. Please check your internet connection.',
            suggestion: 'Verify you are connected to the internet and try again.',
            canRetry: true,
            retryAfter: 5000
        };
    }

    // File size errors
    if (message.includes('file size') || message.includes('too large')) {
        return {
            type: 'file_size',
            userMessage: `File exceeds the ${GEMINI_FILE_SIZE_LIMIT_MB}MB limit.`,
            suggestion: 'Please use a smaller audio file or compress the file before uploading.',
            canRetry: false
        };
    }

    // JSON parsing errors
    if (message.includes('JSON') || message.includes('parse')) {
        return {
            type: 'parsing',
            userMessage: 'AI response could not be processed. This may be a temporary issue.',
            suggestion: 'Try processing this file again. If the issue persists, the audio quality may be too poor.',
            canRetry: true,
            retryAfter: 3000
        };
    }

    // Empty or invalid response errors
    if (message.includes('empty response') || message.includes('No audio data')) {
        return {
            type: 'empty_response',
            userMessage: 'AI returned an incomplete response.',
            suggestion: 'Please retry the operation. If it continues to fail, contact support.',
            canRetry: true,
            retryAfter: 3000
        };
    }

    // Validation errors (user-caused)
    if (message.includes('Invalid timestamp') || message.includes('Non-sequential')) {
        return {
            type: 'validation',
            userMessage: message,
            suggestion: 'This is likely due to poor audio quality. Try enhancing the audio file or using a different recording.',
            canRetry: false
        };
    }

    // Default: Unknown error
    return {
        type: 'unknown',
        userMessage: `An unexpected error occurred: ${message}`,
        suggestion: 'Please try again. If the problem persists, contact tommy@vcb-ai.online',
        canRetry: true,
        retryAfter: 5000
    };
};

const validateApiKey = () => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.trim() === '') {
        return {
            valid: false,
            error: 'Gemini API key is not configured. Please add your API key to the .env.local file.'
        };
    }
    if (!apiKey.startsWith('AIzaSy')) {
        return {
            valid: false,
            error: 'API key format appears invalid. Gemini API keys should start with "AIzaSy".'
        };
    }
    return { valid: true };
};

const validateFileUpload = (file) => {
    const fileSizeMB = file.size / 1024 / 1024;

    if (fileSizeMB > GEMINI_FILE_SIZE_LIMIT_MB) {
        return {
            valid: false,
            error: `File "${file.name}" is ${fileSizeMB.toFixed(2)}MB, which exceeds the ${GEMINI_FILE_SIZE_LIMIT_MB}MB limit.`
        };
    }

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/x-m4a', 'audio/mp4'];
    if (file.type && !validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        return {
            valid: false,
            error: `File "${file.name}" does not appear to be a supported audio format.`
        };
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: `File "${file.name}" is empty (0 bytes).`
        };
    }

    return { valid: true };
};

// --- SVG ICONS ---
const Logo = () => (
    <img src="https://i.postimg.cc/xdJqP9br/logo-transparent-Black-Back.png" alt="VCB AI Logo" style={{ height: '60px', width: 'auto' }} />
);
const Icon = ({ children, size = 16, ...props }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>;
const ExportIcon = () => <Icon size={14}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></Icon>;
const RemoveIcon = () => <Icon><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></Icon>;
const ListenIcon = () => <Icon><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></Icon>;
const StopIcon = () => <Icon fill="currentColor"><rect x="6" y="6" width="12" height="12"></rect></Icon>;
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></Icon>;
const ClearSearchIcon = () => <Icon><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></Icon>;
const SpinnerIcon = () => <svg width="18" height="18" viewBox="25 25 50 50" style={{ animation: 'spin 1.5s linear infinite' }}><circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" style={{ animation: 'dash 1.5s ease-in-out infinite' }} /></svg>;
const CheckIcon = () => <Icon strokeWidth="3"><path d="M20 6 9 17l-5-5"/></Icon>;
const StandardTierIcon = () => <Icon strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></Icon>;
const EnhancedTierIcon = () => <Icon strokeWidth="1.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></Icon>;
const LegalTierIcon = () => <Icon strokeWidth="1.5"><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a10 10 0 1 0 10 10c0-4.42-3.58-8-8-8"></path><path d="M12 22a10 10 0 1 1-10-10c0 4.42 3.58 8 8 8"></path><path d="M12 2a10 10 0 1 1-10 10c0-4.42 3.58 8 8 8z"></path></Icon>;
const SummaryIcon = () => <Icon size={14}><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"/><path d="M12 12H8"/><path d="M12 16H8"/><path d="M16 12h-1"/><path d="M16 16h-1"/></Icon>;
const ActionItemIcon = () => <Icon size={14}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>;
const TidyIcon = () => <Icon size={14}><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M12 12 2 22"/></Icon>;
const AlertIcon = () => <Icon><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></Icon>;
const InfoIcon = () => <Icon><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></Icon>;

// --- DEBOUNCE HOOK ---
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    maxWidth: '800px',
                    margin: '64px auto',
                    padding: '32px',
                    backgroundColor: '#F8F9FA',
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px' }}>
                        Application Error
                    </h1>
                    <p style={{ fontWeight: 300, marginBottom: '24px', lineHeight: 1.6 }}>
                        The application encountered an unexpected error. Please refresh the page to continue.
                    </p>
                    <details style={{ textAlign: 'left', marginTop: '24px', fontSize: '14px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '12px' }}>
                            Error Details
                        </summary>
                        <pre style={{
                            backgroundColor: '#FFFFFF',
                            padding: '16px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            border: '1px solid #E9ECEF',
                            fontWeight: 300
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="button button-primary"
                        style={{ marginTop: '24px', padding: '12px 24px' }}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// --- ENHANCED JSON PARSING WITH RECOVERY ---
const parseAIResponse = (resultText) => {
    // First, try standard JSON parse
    try {
        const cleanText = resultText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.warn("Initial JSON parsing failed, attempting repairs...", error);
    }

    // Attempt multiple repair strategies
    const repairStrategies = [
        // Strategy 1: Fix version numbers
        (text) => text.replace(/(":(?:\s)*)(\d+\.\d+\.\d+)/g, '$1"$2"'),
        // Strategy 2: Remove trailing commas
        (text) => text.replace(/,(\s*[}\]])/g, '$1'),
        // Strategy 3: Remove control characters
        (text) => text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''),
        // Strategy 4: Fix incomplete JSON by adding closing brackets
        (text) => {
            let openBrackets = (text.match(/{/g) || []).length;
            let closeBrackets = (text.match(/}/g) || []).length;
            let openArrays = (text.match(/\[/g) || []).length;
            let closeArrays = (text.match(/]/g) || []).length;
            let fixed = text;
            for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += '}';
            for (let i = 0; i < openArrays - closeArrays; i++) fixed += ']';
            return fixed;
        }
    ];

    // Try each strategy individually
    for (const strategy of repairStrategies) {
        try {
            const cleanText = resultText.replace(/```json|```/g, '').trim();
            const repairedText = strategy(cleanText);
            return JSON.parse(repairedText);
        } catch (error) {
            continue;
        }
    }

    // Try combining all strategies
    try {
        let cleanText = resultText.replace(/```json|```/g, '').trim();
        for (const strategy of repairStrategies) {
            cleanText = strategy(cleanText);
        }
        return JSON.parse(cleanText);
    } catch (error) {
        throw new Error(`Failed to parse AI response after all repair attempts. Original error: ${error.message}`);
    }
};

// --- CONFIRMATION DIALOG COMPONENT ---

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: '#FFFFFF',
                padding: '32px',
                borderRadius: '8px',
                maxWidth: '400px',
                border: '1px solid #E9ECEF'
            }}>
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#212529'
                }}>Confirm Action</h3>
                <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#6C757D'
                }}>{message}</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        className="button button-secondary"
                        style={{ padding: '8px 16px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="button button-primary"
                        style={{ padding: '8px 16px', backgroundColor: '#000000' }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- TOAST NOTIFICATION COMPONENT ---

const Toast = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getStyles = () => {
        const baseStyles = {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            maxWidth: '400px',
            padding: '16px 20px',
            backgroundColor: '#212529',
            color: '#FFFFFF',
            border: '1px solid #6C757D',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-out',
            fontSize: '14px',
            lineHeight: '1.5'
        };

        if (type === 'error') {
            return { ...baseStyles, borderColor: '#000000', borderLeftWidth: '4px' };
        }
        if (type === 'warning') {
            return { ...baseStyles, borderColor: '#6C757D', borderLeftWidth: '4px' };
        }
        return baseStyles;
    };

    return (
        <div style={getStyles()}>
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                {type === 'error' && <AlertIcon />}
                {type === 'warning' && <AlertIcon />}
                {type === 'info' && <InfoIcon />}
            </div>
            <div style={{ flex: 1, whiteSpace: 'pre-line' }}>{message}</div>
            <button
                onClick={onClose}
                style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    padding: '0',
                    marginTop: '2px'
                }}
            >
                <ClearSearchIcon />
            </button>
        </div>
    );
};

// --- DOCX EXPORT HELPERS ---

const commonStyles = {
    font: "Arial",
    title: { size: 28, bold: true, font: "Arial" },
    subtitle: { size: 11, color: "6c757d", font: "Calibri" },
    heading: { size: 24, bold: true, font: "Arial" },
    body: { size: 24, font: "Arial" }, // 12pt
    tableHeader: { size: 20, bold: true, font: "Arial" },
    tableContent: { size: 20, font: "Arial" },
};

const createStandardHeader = (text) => new DocxHeader({
    children: [new Paragraph({
        children: [new TextRun({ text, ...commonStyles.subtitle })],
        alignment: AlignmentType.RIGHT,
    })],
});

const createStandardFooter = () => new Footer({
    children: [new Paragraph({
        children: [
            new TextRun({ text: "Page ", ...commonStyles.subtitle }),
            new TextRun({ children: [PageNumber.CURRENT], ...commonStyles.subtitle }),
            new TextRun({ text: " of ", ...commonStyles.subtitle }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], ...commonStyles.subtitle }),
        ],
        alignment: AlignmentType.CENTER,
    })],
});

const generateLegalDoc = (result) => {
    const { filename, timestamp, speakerProfiles, transcription, displayLanguage, translations, modelUsed } = result;
    const serialNumber = generateSerialNumber();
    const hasTranslation = displayLanguage !== 'Original' && translations[displayLanguage];

    const createTranscriptSection = (transcript, title) => {
        let lineNumber = 1;
        const paragraphs = [new Paragraph({ text: title, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER })];
        transcript.forEach(item => {
            paragraphs.push(new Paragraph({
                children: [
                    new TextRun({ text: `${lineNumber++}.\t`, ...commonStyles.body }),
                    new TextRun({ text: `${item.timestamp} ${item.speaker}:\t`, bold: true, ...commonStyles.body }),
                    new TextRun({ text: item.dialogue, ...commonStyles.body }),
                ],
                spacing: { line: 360 }, // 1.5 spacing
                alignment: AlignmentType.JUSTIFIED,
            }));
        });
        return paragraphs;
    };

    const sections = [{
        headers: { default: createStandardHeader(`Case No: [Case Number Placeholder]`) },
        footers: { default: createStandardFooter() },
        children: [
            // Cover Page
            new Paragraph({ text: "IN THE MAGISTRATE'S COURT FOR THE DISTRICT OF [DISTRICT]", alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            new Paragraph({ text: "HELD AT [COURT LOCATION]", alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
            new Paragraph({ children: [new TextRun({ text: "CASE NO: [Case Number Placeholder]", underline: {} })], alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
            new Paragraph({ text: "In the matter between:", spacing: { after: 400 } }),
            new Paragraph({ text: "[PROSECUTOR/PLAINTIFF NAME]", alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
            new Paragraph({ text: "and", alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
            new Paragraph({ text: "[DEFENDANT/ACCUSED NAME]", alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
            new Paragraph({ text: hasTranslation ? "TRANSCRIPT OF AUDIO RECORDING AND CERTIFIED TRANSLATION" : "TRANSCRIPT OF AUDIO RECORDING", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            new Paragraph({ text: `Date of Recording: ${new Date(timestamp).toLocaleDateString()}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Date of Transcription: ${new Date().toLocaleDateString()}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Serial Number: ${serialNumber}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "", pageBreakBefore: true }),
            // Speaker Index
            new Paragraph({ text: "SPEAKER INDEX", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            new Table({
                rows: [
                    new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SPEAKER IDENTIFIER", ...commonStyles.tableHeader })] })] })] }),
                    ...speakerProfiles.map(p => new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.speaker, ...commonStyles.tableContent })] })] })] }))
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ text: "", pageBreakBefore: true }),
            // Transcript
            ...createTranscriptSection(transcription, hasTranslation ? "Original Transcript (English)" : "Transcript"),
            // Translation (if exists)
            ...(hasTranslation ? [new Paragraph({ text: "", pageBreakBefore: true }), ...createTranscriptSection(translations[displayLanguage], `Certified Translation (${displayLanguage})`)] : []),
            // Certificate
            new Paragraph({ text: "", pageBreakBefore: true }),
            new Paragraph({ text: "CERTIFICATE OF TRANSCRIPTION", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
            new Paragraph({
                text: `I, the undersigned, hereby certify that the foregoing is a true and correct transcript of the audio recording provided, processed by the VCB AI Transcription Service on ${new Date().toLocaleString()}. The transcription was generated using the ${modelUsed} model.`,
                ...commonStyles.body,
                alignment: AlignmentType.JUSTIFIED,
                spacing: { line: 360 }
            }),
            ...(hasTranslation ? [new Paragraph({
                text: `Furthermore, I certify that the accompanying translation into ${displayLanguage} is, to the best of my knowledge, a faithful and accurate rendering of the original transcript, also generated by the VCB AI system.`,
                ...commonStyles.body,
                alignment: AlignmentType.JUSTIFIED,
                spacing: { line: 360, before: 400 }
            })] : []),
             new Paragraph({ text: `Document Serial Number: ${serialNumber}`, alignment: AlignmentType.LEFT, spacing: { before: 800 } }),
             new Paragraph({ text: "Signature: ___________________________", alignment: AlignmentType.LEFT, spacing: { before: 400 } }),
             new Paragraph({ text: "VCB AI Transcription Service", alignment: AlignmentType.LEFT }),
        ]
    }];
    return new Document({ sections, styles: { default: { document: { run: { font: commonStyles.font, size: commonStyles.body.size } } } } });
};

const generateStandardTranscriptDoc = (result) => {
    const { filename, transcription, displayLanguage, translations } = result;
    const hasTranslation = displayLanguage !== 'Original' && translations[displayLanguage];
    const createTranscriptSection = (transcript, title) => {
        let lineNumber = 1;
        return [
            new Paragraph({ text: title, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
            ...transcript.map(item => new Paragraph({
                children: [
                    new TextRun({ text: `${lineNumber++}.\t`, ...commonStyles.body }),
                    new TextRun({ text: `${item.timestamp} ${item.speaker}:\t`, bold: true, ...commonStyles.body }),
                    new TextRun({ text: item.dialogue, ...commonStyles.body })
                ],
                spacing: { line: 360 },
                alignment: AlignmentType.JUSTIFIED,
            }))
        ];
    };
    return new Document({
        sections: [{
            headers: { default: createStandardHeader(filename) },
            footers: { default: createStandardFooter() },
            children: [
                new Paragraph({ text: "TRANSCRIPT", ...commonStyles.title, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                new Paragraph({ text: filename, ...commonStyles.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
                ...createTranscriptSection(transcription, hasTranslation ? "Original Transcript" : "Transcript"),
                ...(hasTranslation ? [new Paragraph({ pageBreakBefore: true }), ...createTranscriptSection(translations[displayLanguage], `Translation (${displayLanguage})`)] : [])
            ]
        }],
        styles: { default: { document: { run: { font: commonStyles.font, size: commonStyles.body.size } } } }
    });
};

const generateAnalysisReportDoc = (result) => {
    const { filename, summary, actionItems, detailedAnalysis } = result;
    const children = [
        new Paragraph({ text: "ANALYSIS REPORT", ...commonStyles.title, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ text: filename, ...commonStyles.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
    ];
    if (summary) {
        children.push(new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }));
        children.push(new Paragraph({ text: summary, ...commonStyles.body, spacing: { line: 360 }, alignment: AlignmentType.JUSTIFIED }));
    }
    if (actionItems && actionItems.length > 0) {
        children.push(new Paragraph({ text: "Action Items", heading: HeadingLevel.HEADING_2, spacing: { after: 200, before: 400 } }));
        actionItems.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 0 }, ...commonStyles.body, spacing: { line: 360 }, alignment: AlignmentType.JUSTIFIED })));
    }
    if (detailedAnalysis) {
        children.push(new Paragraph({ text: "Detailed Analysis", heading: HeadingLevel.HEADING_2, spacing: { after: 200, before: 400 } }));
        const table = new Table({
            rows: [
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Metric", ...commonStyles.tableHeader })] }), new TableCell({ children: [new Paragraph({ text: "Value", ...commonStyles.tableHeader })] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Readability Score", ...commonStyles.tableContent })] }), new TableCell({ children: [new Paragraph({ text: String(detailedAnalysis.sentenceComplexity.readabilityScore), ...commonStyles.tableContent })] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Avg. Words/Sentence", ...commonStyles.tableContent })] }), new TableCell({ children: [new Paragraph({ text: String(detailedAnalysis.sentenceComplexity.wordsPerSentence), ...commonStyles.tableContent })] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Keywords", ...commonStyles.tableContent })] }), new TableCell({ children: [new Paragraph({ text: detailedAnalysis.keywordDensity.join(', '), ...commonStyles.tableContent })] })] })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        });
        children.push(table);
    }
    return new Document({ sections: [{ headers: { default: createStandardHeader(filename) }, footers: { default: createStandardFooter() }, children }], styles: { default: { document: { run: { font: commonStyles.font, size: commonStyles.body.size } } } } });
};

const generateWaveformSvg = (waveformData) => {
    const width = 800;
    const height = 100;
    const barWidth = 3;
    const gap = 1;
    const bars = waveformData.map((d, i) =>
        `<rect x="${i * (barWidth + gap)}" y="${(height - (d * height)) / 2}" width="${barWidth}" height="${d * height}" fill="#6C757D" rx="1.5" />`
    ).join('');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F8F9FA" />${bars}</svg>`;
};


// --- SUB-COMPONENTS ---

const AppHeader = () => (
    <header style={{ 
        backgroundColor: 'var(--color-on-surface)',
        color: 'var(--color-surface)',
        padding: 'var(--spacing-4) var(--spacing-5)',
        borderRadius: 'var(--border-radius)',
        marginBottom: 'var(--spacing-8)',
        display: 'flex', 
        alignItems: 'center', 
        gap: 'var(--spacing-5)', 
    }}>
        <Logo />
        <div>
            <h1 style={{ fontWeight: 700, fontSize: '28px', color: 'var(--color-surface)', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                VCB AI Transcription
            </h1>
            <p style={{ fontWeight: 300, fontSize: '16px', lineHeight: 1.5, margin: 'var(--spacing-2) 0 0 0', color: 'var(--color-border)' }}>
                Enterprise-grade transcription and analysis service.
            </p>
        </div>
    </header>
);

const TierDescription = ({ icon, title, description }) => (
    <div style={{ flex: '1 1 300px', display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-start', padding: 'var(--spacing-5)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--border-radius)' }}>
        <div style={{ color: 'var(--color-primary)' }}>{icon}</div>
        <div>
            <h4 style={{ margin: '0 0 var(--spacing-2) 0', fontSize: '14px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-on-surface-secondary)', lineHeight: 1.6 }}>{description}</p>
        </div>
    </div>
);

const UploadSection = ({ onFileSelect, onClearAll, files }) => {
    const fileInputRef = useRef(null);
    return (
        <section className="card" style={{ padding: 'var(--spacing-6)' }}>
            <h2 className="section-title">Upload & Process</h2>
            <div style={{ marginBottom: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                <TierDescription icon={<StandardTierIcon />} title="Standard" description="Fast & cost-effective. Ideal for meeting notes and general use. Uses VCB-AI-Flash." />
                <TierDescription icon={<EnhancedTierIcon />} title="Enhanced" description="Higher accuracy for noisy audio or multiple speakers. Uses VCB-AI-Pro." />
                <TierDescription icon={<LegalTierIcon />} title="Legal" description="Verbatim, court-ready format with no PII redaction. Uses VCB-AI-Pro." />
            </div>
            <input ref={fileInputRef} type="file" multiple accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.opus" onChange={onFileSelect} style={{ display: 'none' }} aria-label="File uploader" />
            <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => fileInputRef.current?.click()} className="button button-primary">SELECT FILES</button>
                {files.length > 0 && <button onClick={onClearAll} className="button button-secondary">CLEAR ALL</button>}
            </div>
        </section>
    );
};

const TierButton = ({ onClick, children }) => (
    <button onClick={onClick} className="button" style={{ flex: 1, minWidth: '100px', fontSize: '12px', padding: 'var(--spacing-2) var(--spacing-3)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', border: '1px solid var(--color-border)', fontWeight: 500 }}>
        {children}
    </button>
);

const FileItem = ({ file, onTranscribe, onRemove }) => (
    <div className="card" style={{ padding: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: 'var(--spacing-2)', wordBreak: 'break-all', textTransform: 'uppercase' }}>{file.name}</div>
                <div style={{ fontWeight: 300, fontSize: '14px', color: 'var(--color-on-surface-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                    <span>{file.size} MB</span><span>•</span>
                    <span style={{ color: file.status === 'completed' ? 'var(--color-success)' : file.status === 'error' ? 'var(--color-danger)' : 'var(--color-on-surface-secondary)', fontWeight: 500 }}>{file.status.toUpperCase()}</span>
                </div>
            </div>
            <button onClick={() => onRemove(file.id)} title="Remove file" className="button-secondary" style={{ padding: 'var(--spacing-2)', border: 'none' }}><RemoveIcon /></button>
        </div>
        {file.error && <div style={{ padding: 'var(--spacing-3)', backgroundColor: '#F8F9FA', border: '2px solid var(--color-on-surface)', color: 'var(--color-on-surface)', borderRadius: '6px', fontSize: '14px', lineHeight: 1.5, fontWeight: '500' }}><strong>Error:</strong> {file.error}</div>}
        {file.status === 'pending' && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-4)' }}>
                <label style={{ fontWeight: 700, fontSize: '12px', marginBottom: 'var(--spacing-3)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-on-surface-secondary)' }}>Choose Tier to Start Transcription</label>
                <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                    <TierButton onClick={() => onTranscribe(file, 'Standard')}>Standard</TierButton>
                    <TierButton onClick={() => onTranscribe(file, 'Enhanced')}>Enhanced</TierButton>
                    <TierButton onClick={() => onTranscribe(file, 'Legal')}>Legal</TierButton>
                </div>
            </div>
        )}
        {(file.status === 'uploading' || file.status === 'processing') && (
            <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: '12px', color: 'var(--color-on-surface-secondary)', marginBottom: 'var(--spacing-2)' }}>
                    {file.status === 'processing' && <SpinnerIcon />}
                    <span>
                        {file.status === 'uploading' && `Loading file... ${file.progress}%`}
                        {file.status === 'processing' && `Analyzing with AI... ${file.progress || 0}% (Tier: ${file.processingTier})`}
                    </span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                   <div style={{ width: `${file.progress || 0}%`, height: '100%', backgroundColor: 'var(--color-on-surface)', borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
                </div>
            </div>
        )}
    </div>
);

const WaveformVisualizer = ({ waveformData, duration, playbackTime }) => {
    const playheadPosition = duration > 0 ? (playbackTime / duration) * 100 : 0;
    return (
        <div style={{ height: '80px', backgroundColor: 'var(--color-background)', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 var(--spacing-2)', position: 'relative', border: '1px solid var(--color-border)' }}>
            {waveformData.map((d, i) => <div key={i} style={{ height: `${Math.max(2, d * 90)}%`, width: '2px', backgroundColor: '#CED4DA', margin: '0 1px', borderRadius: '1px' }} />)}
            {playbackTime > 0 && <div style={{ position: 'absolute', left: `${playheadPosition}%`, top: 0, bottom: 0, width: '2px', backgroundColor: 'var(--color-primary)' }} />}
        </div>
    );
};

const DetailedAnalysisCard = ({ analysis, summary, actionItems }) => {
    if (!analysis && !summary && !actionItems) return null;
    return (
        <div style={{ border: '1px solid var(--color-border)', padding: 'var(--spacing-5)', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Detailed Analysis</h4>
            {summary && (
                <div>
                    <h5 style={{ margin: '0 0 var(--spacing-3)', fontSize: '12px', fontWeight: 600 }}>Summary</h5>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{summary}</p>
                </div>
            )}
            {actionItems && actionItems.length > 0 && (
                 <div>
                    <h5 style={{ margin: '0 0 var(--spacing-3)', fontSize: '12px', fontWeight: 600 }}>Action Items</h5>
                    <ul style={{ margin: 0, paddingLeft: 'var(--spacing-5)', fontSize: '14px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                       {actionItems.map((item, index) => <li key={index}>{item.replace(/^- /, '')}</li>)}
                    </ul>
                </div>
            )}
             {analysis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-5)' }}>
                    <div>
                        <h5 style={{ margin: '0 0 var(--spacing-3)', fontSize: '12px', fontWeight: 600 }}>Sentence Complexity</h5>
                        <p style={{ margin: 0, fontSize: '14px' }}>Readability: {analysis.sentenceComplexity.readabilityScore}</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Avg. Words/Sentence: {analysis.sentenceComplexity.wordsPerSentence}</p>
                    </div>
                    <div>
                        <h5 style={{ margin: '0 0 var(--spacing-3)', fontSize: '12px', fontWeight: 600 }}>Keyword Density</h5>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                            {analysis.keywordDensity.map(kw => <span key={kw} style={{ backgroundColor: 'var(--color-border)', padding: 'var(--spacing-1) var(--spacing-2)', borderRadius: '4px', fontSize: '12px' }}>{kw}</span>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ExportPopover = ({ onExport, onCancel, file, showToast }) => {
    const [options, setOptions] = useState({ transcript: true, waveform: true, analysis: file.processingTier !== 'Legal' });
    const popoverRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (popoverRef.current && !popoverRef.current.contains(event.target)) onCancel(); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onCancel]);
    const handleToggle = (option) => setOptions(prev => ({ ...prev, [option]: !prev[option] }));
    const handleExportClick = () => {
        if (!options.transcript && !options.waveform && !options.analysis) {
            showToast("Please select at least one component to export.", 'warning');
            return;
        }
        onExport(options);
    };

    return (
        <div ref={popoverRef} style={{ position: 'absolute', top: '48px', right: 0, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-lg)', zIndex: 10, padding: 'var(--spacing-4)', width: '240px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-2)', marginBottom: 'var(--spacing-1)' }}>Export Options</div>
            {Object.entries({ transcript: 'Transcript (.docx)', waveform: 'Waveform (.svg)', analysis: 'Analysis Report (.docx)' }).map(([key, label]) => {
                if (key === 'analysis' && file.processingTier === 'Legal') return null;
                return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer', fontSize: '14px' }} onClick={() => handleToggle(key)}>
                        <input type="checkbox" checked={options[key]} readOnly style={{ accentColor: 'var(--color-primary)' }} />
                        <label>{label}</label>
                    </div>
                );
            })}
            <button onClick={handleExportClick} className="button button-primary" style={{ marginTop: 'var(--spacing-3)', width: '100%', padding: 'var(--spacing-2)' }}>Download Package</button>
        </div>
    );
};

const HighlightedText = React.memo(({ text, query }) => {
    if (!query || query.trim() === '') return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return <>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <mark key={i} className="search-highlight">{part}</mark> : part)}</>;
});

const AIActionCard = ({ result, onSummarize, onExtractItems, onToggleTidied }) => {
    return (
         <div style={{ border: '1px solid var(--color-border)', padding: 'var(--spacing-5)', borderRadius: 'var(--border-radius)' }}>
            <h4 style={{ margin: '0 0 var(--spacing-5) 0', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>VCB AI Actions</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
                <button onClick={onSummarize} className="button button-secondary" disabled={result.isSummarizing}>
                    {result.isSummarizing ? <SpinnerIcon /> : <SummaryIcon />} Generate Summary
                </button>
                 <button onClick={onExtractItems} className="button button-secondary" disabled={result.isExtracting}>
                    {result.isExtracting ? <SpinnerIcon /> : <ActionItemIcon />} Extract Action Items
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: '0 var(--spacing-3)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                     <label htmlFor={`tidy-toggle-${result.filename}`} style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Tidied View</label>
                     <button
                        id={`tidy-toggle-${result.filename}`}
                        role="switch"
                        aria-checked={result.showTidied}
                        onClick={onToggleTidied}
                        style={{
                            position: 'relative',
                            width: '40px',
                            height: '22px',
                            borderRadius: '11px',
                            backgroundColor: result.showTidied ? 'var(--color-primary)' : 'var(--color-border)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                    >
                        <span style={{
                            position: 'absolute',
                            top: '2px',
                            left: result.showTidied ? '20px' : '2px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            transition: 'left 0.2s',
                        }}></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultCard = ({ file, onExport, onTranslate, onUpdateFile, audioContext, onGenerateSummary, onExtractActionItems, onToggleTidiedView, showToast }) => {
    const { id, result } = file;
    const [playbackState, setPlaybackState] = useState({ status: 'idle', currentTime: 0, currentSegment: -1 });
    const [showExportPopover, setShowExportPopover] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatches, setSearchMatches] = useState(0);
    const activeSourceRef = useRef(null);
    const audioBufferCacheRef = useRef({});
    const isPlayingRef = useRef(false);
    const segmentRefs = useRef(new Map());
    const animationFrameRef = useRef();

    useEffect(() => {
        if (playbackState.currentSegment >= 0) {
            const node = segmentRefs.current.get(playbackState.currentSegment);
            node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [playbackState.currentSegment]);

    const transcriptionToDisplay = result.showTidied && result.tidiedTranscription ? result.tidiedTranscription : result.displayTranscription;
    
    useEffect(() => {
        if (!searchQuery || searchQuery.trim() === '') { setSearchMatches(0); return; }
        const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'gi');
        const count = transcriptionToDisplay.reduce((acc, item) => acc + (item.dialogue.match(regex) || []).length, 0);
        setSearchMatches(count);
    }, [searchQuery, transcriptionToDisplay]);

    const stopPlayback = useCallback(() => {
        isPlayingRef.current = false;
        if (activeSourceRef.current) {
            activeSourceRef.current.onended = null;
            try { activeSourceRef.current.stop(); } catch (e) { /* ignore */ }
            activeSourceRef.current = null;
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setPlaybackState({ status: 'idle', currentTime: 0, currentSegment: -1 });
    }, []);

    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const fetchAndDecodeSegment = useCallback(async (segment) => {
        try {
            // Validate API key before making request
            const apiKeyValidation = validateApiKey();
            if (!apiKeyValidation.valid) {
                throw new Error(apiKeyValidation.error);
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const voiceName = result.voiceMap[segment.speaker];
            const prompt = `Read this aloud naturally: "${segment.dialogue}"`;

            // Set timeout for API call
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TTS request timeout after 30 seconds')), 30000)
            );

            const apiPromise = ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
            });

            const response = await Promise.race([apiPromise, timeoutPromise]);

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                throw new Error("No audio data received from TTS API. This may be a temporary issue.");
            }

            const audioData = atob(base64Audio).split('').map(c => c.charCodeAt(0));
            return await decodePCMAudioData(new Uint8Array(audioData), audioContext);
        } catch (error) {
            const categorized = categorizeError(error);
            console.error('TTS Generation Error:', categorized);
            throw new Error(categorized.userMessage);
        }
    }, [audioContext, result.voiceMap]);

    const playSegment = useCallback(async (index, segmentStartTime) => {
        if (!isPlayingRef.current || index >= transcriptionToDisplay.length) { stopPlayback(); return; }
        setPlaybackState(p => ({ ...p, status: 'playing', currentSegment: index }));
        const nextIndex = index + 1;
        if (nextIndex < transcriptionToDisplay.length && !audioBufferCacheRef.current[nextIndex]) {
            audioBufferCacheRef.current[nextIndex] = fetchAndDecodeSegment(transcriptionToDisplay[nextIndex]);
        }
        try {
            let bufferPromise = audioBufferCacheRef.current[index];
            if (!bufferPromise) { bufferPromise = fetchAndDecodeSegment(transcriptionToDisplay[index]); audioBufferCacheRef.current[index] = bufferPromise; }
            const audioBuffer = await bufferPromise;
            if (!isPlayingRef.current || !audioContext || audioContext.state === 'closed') return;
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            activeSourceRef.current = source;
            const audioStartTime = audioContext.currentTime;
            const updatePlaybackTime = () => {
                if (!isPlayingRef.current) return;
                const elapsedTime = audioContext.currentTime - audioStartTime;
                setPlaybackState(p => ({ ...p, currentTime: segmentStartTime + elapsedTime }));
                animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
            };
            updatePlaybackTime();
            source.onended = () => {
                cancelAnimationFrame(animationFrameRef.current);
                activeSourceRef.current = null;
                if (isPlayingRef.current) playSegment(index + 1, segmentStartTime + audioBuffer.duration);
            };
        } catch (err) {
            console.error(`TTS Error on segment ${index}:`, err);
            onUpdateFile(id, { result: { ...result, ttsError: `Playback failed: ${err.message}` } });
            stopPlayback();
        }
    }, [id, result, audioContext, stopPlayback, onUpdateFile, fetchAndDecodeSegment, transcriptionToDisplay]);

    const handleListen = async () => {
        if (!audioContext || audioContext.state === 'suspended') await audioContext?.resume();
        if (isPlayingRef.current) { stopPlayback(); return; }
        isPlayingRef.current = true;
        setPlaybackState({ status: 'loading', currentTime: 0, currentSegment: -1 });
        audioBufferCacheRef.current = {};
        playSegment(0, 0);
    };

    const isPlaying = playbackState.status === 'playing' || playbackState.status === 'loading';
    return (
        <div className="card" style={{ animation: `fadeIn 0.5s ease-out`, border: isPlaying ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', boxShadow: isPlaying ? '0 0 12px rgba(13, 110, 253, 0.2)' : 'var(--shadow-md)' }}>
            <header style={{ padding: 'var(--spacing-5) var(--spacing-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
                <div>
                    <h3 style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 var(--spacing-2) 0', textTransform: 'uppercase', letterSpacing: '1px', wordBreak: 'break-all' }}>{result.filename}</h3>
                    <div style={{ fontWeight: 400, fontSize: '14px', color: 'var(--color-on-surface-secondary)' }}>
                        {new Date(result.timestamp).toLocaleString()}{result.processingTier && ` • Tier: ${result.processingTier}`}
                    </div>
                </div>
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowExportPopover(p => !p)} className="button button-secondary"><ExportIcon /> EXPORT</button>
                    {showExportPopover && <ExportPopover file={file} onExport={(options) => { onExport(id, options); setShowExportPopover(false); }} onCancel={() => setShowExportPopover(false)} showToast={showToast} />}
                </div>
            </header>
            <div style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-6)' }}>
                <WaveformVisualizer waveformData={result.waveformData} duration={result.duration} playbackTime={playbackState.currentTime} />
                <AIActionCard result={result} onSummarize={() => onGenerateSummary(id)} onExtractItems={() => onExtractActionItems(id)} onToggleTidied={() => onToggleTidiedView(id)} />
                <DetailedAnalysisCard analysis={result.detailedAnalysis} summary={result.summary} actionItems={result.actionItems} />
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', flexWrap: 'wrap', marginBottom: 'var(--spacing-5)' }}>
                        <button onClick={handleListen} title={isPlaying ? "Stop" : "Listen"} className="button" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-on-surface)', border: '1px solid var(--color-border)', width: '42px', height: '42px', padding: 0 }}>
                            {playbackState.status === 'loading' && <SpinnerIcon />}
                            {playbackState.status === 'playing' && <StopIcon />}
                            {playbackState.status === 'idle' && <ListenIcon />}
                        </button>
                        <select value={result.displayLanguage} onChange={(e) => onTranslate(id, e.target.value)} disabled={isPlaying || result.isTranslating} className="button" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-on-surface)', border: '1px solid var(--color-border)', fontWeight: 500, textTransform: 'none', letterSpacing: 'normal' }}>
                            <option value="Original">Original</option>
                            {OFFICIAL_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: '200px' }}>
                            <div style={{ position: 'absolute', left: 'var(--spacing-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-secondary)', pointerEvents: 'none', lineHeight: 0 }}><SearchIcon /></div>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search transcript..." style={{ fontWeight: 500, fontSize: '14px', padding: 'var(--spacing-3) var(--spacing-3) var(--spacing-3) 42px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-surface)', width: '100%' }} />
                            {searchQuery && <button onClick={() => setSearchQuery('')} title="Clear search" style={{ position: 'absolute', right: 'var(--spacing-3)', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-on-surface-secondary)', lineHeight: 0 }}><ClearSearchIcon /></button>}
                        </div>
                        {searchQuery && <span style={{ fontSize: '12px', color: 'var(--color-on-surface-secondary)', flexShrink: 0 }}>{searchMatches} match{searchMatches !== 1 ? 'es' : ''}</span>}
                        {result.ttsError && <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{result.ttsError}</span>}
                    </div>
                    <div style={{ position: 'relative' }}>
                        {result.isTranslating && (
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--border-radius)', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                <SpinnerIcon />
                                <span style={{ fontSize: '12px', color: 'var(--color-on-surface-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>TRANSLATING... {result.translationProgress || 0}%</span>
                            </div>
                        )}
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: 'var(--spacing-4)', transition: 'opacity 0.3s ease', opacity: result.isTranslating ? 0.4 : 1 }}>
                            {transcriptionToDisplay.map((item, index) => (
                                <div key={index} ref={el => el ? segmentRefs.current.set(index, el) : segmentRefs.current.delete(index)} style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--spacing-2)' }}>{item.speaker} <span style={{ color: 'var(--color-on-surface-secondary)', fontWeight: 500 }}>{item.timestamp}</span></div>
                                    <p className={playbackState.currentSegment === index ? 'highlight-text' : ''} style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, padding: 'var(--spacing-2)', borderRadius: '6px' }}>
                                        <HighlightedText text={item.dialogue} query={searchQuery} />
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const VCBTranscriptionService = () => {
    const [files, setFiles] = useState([]);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [apiKeyStatus, setApiKeyStatus] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const audioContextRef = useRef(null);
    const lastSavedFilesRef = useRef(null);
    const abortControllersRef = useRef({});  // Track abort controllers for cancellable operations
    const progressIntervalsRef = useRef({});  // Track progress intervals by file ID to prevent race conditions
    const debouncedFiles = useDebounce(files, 1500);

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const cancelOperation = (fileId, operationType) => {
        const key = `${fileId}_${operationType}`;
        const controller = abortControllersRef.current[key];

        if (controller) {
            controller.abort();
            delete abortControllersRef.current[key];

            const file = files.find(f => f.id === fileId);
            if (file && file.result) {
                const updates = {};

                switch (operationType) {
                    case 'translation':
                        updates.isTranslating = false;
                        updates.translationProgress = 0;
                        break;
                    case 'summary':
                        updates.isSummarizing = false;
                        break;
                    case 'actionItems':
                        updates.isExtracting = false;
                        break;
                    case 'tidied':
                        updates.isTidying = false;
                        updates.showTidied = false;
                        break;
                }

                updateFile(fileId, { result: { ...file.result, ...updates } });
            }

            showToast(`${operationType} operation cancelled.`, 'info');
        }
    };

    // Validate API key on component mount
    useEffect(() => {
        const validation = validateApiKey();
        if (!validation.valid) {
            setApiKeyStatus({ valid: false, error: validation.error });
            console.error('API Key Validation Failed:', validation.error);
        } else {
            setApiKeyStatus({ valid: true });
        }
    }, []);

    useEffect(() => {
        const initAudioContext = () => { if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)(); window.removeEventListener('click', initAudioContext); };
        window.addEventListener('click', initAudioContext);
        return () => window.removeEventListener('click', initAudioContext);
    }, []);

    useEffect(() => {
        try {
            const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedStateJSON) { setFiles(JSON.parse(savedStateJSON)); lastSavedFilesRef.current = savedStateJSON; }
        } catch (error) { console.error("Failed to load state from localStorage:", error); }
    }, []);

    useEffect(() => {
        if (debouncedFiles.length > 0) {
            setSaveStatus('saving');
            try {
                const filesToSave = debouncedFiles.map(({ file, ...rest }) => rest);
                const filesJSON = JSON.stringify(filesToSave);
                 if (filesJSON !== lastSavedFilesRef.current) {
                    localStorage.setItem(LOCAL_STORAGE_KEY, filesJSON);
                    lastSavedFilesRef.current = filesJSON;
                    setSaveStatus('saved');
                } else {
                    setSaveStatus('idle');
                }
            } catch (error) {
                console.error("Failed to save state to localStorage:", error);
                // Check if it's a quota exceeded error
                if (error.name === 'QuotaExceededError' || error.code === 22) {
                    setSaveStatus('quota_exceeded');
                    console.error('localStorage quota exceeded. Consider clearing old sessions or reducing saved data.');
                } else {
                    setSaveStatus('error');
                }
            }
        } else {
             localStorage.removeItem(LOCAL_STORAGE_KEY);
             setSaveStatus('idle');
        }
    }, [debouncedFiles]);

    const updateFile = (id, updates) => setFiles(prevFiles => prevFiles.map(f => f.id === id ? { ...f, ...updates } : f));

    const handleFileSelect = (event) => {
        const selectedFiles = Array.from(event.target.files);

        // Validate batch size
        if (selectedFiles.length > MAX_FILES_PER_BATCH) {
            showToast(`You can only upload up to ${MAX_FILES_PER_BATCH} files at once. Please select fewer files.`, 'warning');
            event.target.value = '';
            return;
        }

        // Validate each file
        const validatedFiles = [];
        const errors = [];

        selectedFiles.forEach((file, index) => {
            const validation = validateFileUpload(file);
            if (validation.valid) {
                validatedFiles.push({
                    id: Date.now() + index,
                    file,
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2),
                    status: 'pending',
                    progress: 0
                });
            } else {
                errors.push(validation.error);
            }
        });

        // Show errors if any files failed validation
        if (errors.length > 0) {
            showToast(`File validation errors:\n\n${errors.join('\n')}`, 'error');
        }

        // Add only valid files
        if (validatedFiles.length > 0) {
            setFiles(prev => [...prev.filter(f => f.status !== 'pending'), ...validatedFiles]);
        }

        event.target.value = '';
    };

    const transcribeAudio = async (fileObj, tier) => {
        updateFile(fileObj.id, { status: 'uploading', error: null, progress: 0, processingTier: tier });

        // Use ref-based progress tracking to prevent race conditions with concurrent transcriptions
        const simulateProgress = (targetProgress, onComplete) => {
            // Clear any existing interval for this file
            if (progressIntervalsRef.current[fileObj.id]) {
                clearInterval(progressIntervalsRef.current[fileObj.id]);
            }

            progressIntervalsRef.current[fileObj.id] = setInterval(() => {
                setFiles(prevFiles => prevFiles.map(f => {
                    if (f.id === fileObj.id) {
                        const currentProgress = f.progress || 0;
                        let increment = 0;
                        if (currentProgress < 60) increment = Math.random() * 3 + 2; // Fast start
                        else if (currentProgress < 90) increment = Math.random() * 2 + 1; // Slows down
                        else increment = Math.random() * 0.5 + 0.2; // Crawls to the end
                        const newProgress = Math.min(currentProgress + increment, targetProgress);
                        if (newProgress >= targetProgress) {
                            clearInterval(progressIntervalsRef.current[fileObj.id]);
                            delete progressIntervalsRef.current[fileObj.id];
                            if (onComplete) onComplete();
                        }
                        return { ...f, progress: Math.round(newProgress) };
                    }
                    return f;
                }));
            }, 150);
        };
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const audioBase64 = await fileToBase64WithProgress(fileObj.file, (progress) => updateFile(fileObj.id, { progress }));
            
            updateFile(fileObj.id, { status: 'processing', progress: 0 });
            
            simulateProgress(95); // Simulate progress while waiting for AI

            const waveformData = await generateWaveformData(fileObj.file);
            const highCourtPrompt = `Perform a VERBATIM transcription...`; // Content omitted for brevity
            const standardPrompt = `Analyze the audio and provide a comprehensive analysis...`; // Content omitted for brevity
            const isLegalSubmission = tier === 'Legal';
            const textPart = { text: isLegalSubmission ? highCourtPrompt : standardPrompt };
            const audioPart = { inlineData: { data: audioBase64, mimeType: fileObj.file.type || 'audio/mpeg' } };
            const geminiModelName = (tier === 'Enhanced' || tier === 'Legal') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            const displayModelName = (tier === 'Enhanced' || tier === 'Legal') ? 'VCB-AI-Pro' : 'VCB-AI-Flash';
            
            const response = await ai.models.generateContent({ model: geminiModelName, contents: { parts: [audioPart, textPart] }, config: { responseMimeType: 'application/json' } });

            // Stop simulation before final processing
            if (progressIntervalsRef.current[fileObj.id]) {
                clearInterval(progressIntervalsRef.current[fileObj.id]);
                delete progressIntervalsRef.current[fileObj.id];
            }
            updateFile(fileObj.id, { progress: 96 });

            const resultText = response.text;
            if (!resultText || resultText.trim() === '') throw new Error("The AI returned an empty response.");

            let result;
            let parsedJson;

            // Use enhanced JSON parser with multiple recovery strategies
            try {
                parsedJson = parseAIResponse(resultText);
            } catch (error) {
                throw new Error(`AI response is not valid JSON, even after attempting multiple repair strategies. Details: ${error.message}`);
            }
            
            if (parsedJson && parsedJson.transcription && Array.isArray(parsedJson.transcription)) {
                result = parsedJson;
            } 
            else if (parsedJson && Array.isArray(parsedJson)) {
                if (parsedJson.length > 0 && typeof parsedJson[0] === 'object' && parsedJson[0] !== null && 'start' in parsedJson[0] && 'text' in parsedJson[0]) {
                    console.warn("AI returned a flat transcription array of objects. Adapting to standard format.");
                    const formatSecondsToTimestamp = (totalSeconds) => {
                        const secondsNum = parseFloat(totalSeconds);
                        if (isNaN(secondsNum)) return '[00:00:00]';
                        const hours = Math.floor(secondsNum / 3600);
                        const minutes = Math.floor((secondsNum % 3600) / 60);
                        const seconds = Math.floor(secondsNum % 60);
                        return `[${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
                    };
                    result = {
                        transcription: parsedJson.map(segment => ({
                            speaker: segment.speaker || "SPEAKER 1",
                            timestamp: formatSecondsToTimestamp(segment.start),
                            dialogue: segment.text || ""
                        })),
                        speakerProfiles: [{ speaker: "SPEAKER 1", gender: "unknown" }],
                        detailedAnalysis: { sentenceComplexity: { readabilityScore: "N/A", wordsPerSentence: "N/A" }, keywordDensity: [] }
                    };
                } else if (parsedJson.length > 0 && typeof parsedJson[0] === 'string') {
                    console.warn("AI returned a flat array of strings. Adapting to standard format with line numbers.");
                    result = {
                        transcription: parsedJson.map((line, index) => ({
                            speaker: `SPEAKER 1`,
                            timestamp: `[Line ${index + 1}]`,
                            dialogue: line
                        })),
                        speakerProfiles: [{ speaker: "SPEAKER 1", gender: "unknown" }],
                        detailedAnalysis: { sentenceComplexity: { readabilityScore: "N/A", wordsPerSentence: "N/A" }, keywordDensity: [] }
                    };
                } else if (parsedJson.length > 0 && typeof parsedJson[0] === 'object' && parsedJson[0] !== null) {
                    // Generic object array handler - attempt to extract any text-like content (§1.3)
                    console.warn("AI returned a flat array of objects with unknown structure. Attempting flexible extraction.");
                    const formatSecondsToTimestamp = (totalSeconds) => {
                        const secondsNum = parseFloat(totalSeconds);
                        if (isNaN(secondsNum)) return '[00:00:00]';
                        const hours = Math.floor(secondsNum / 3600);
                        const minutes = Math.floor((secondsNum % 3600) / 60);
                        const seconds = Math.floor(secondsNum % 60);
                        return `[${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
                    };

                    result = {
                        transcription: parsedJson.map((segment, index) => {
                            // Try multiple field name variations for text content
                            const dialogue = segment.text || segment.dialogue || segment.content ||
                                           segment.transcription || segment.transcript ||
                                           JSON.stringify(segment);

                            // Try multiple field name variations for speaker
                            const speaker = segment.speaker || segment.name || segment.speakerName || "SPEAKER 1";

                            // Try multiple field name variations for timestamp
                            let timestamp;
                            if (segment.timestamp) {
                                timestamp = segment.timestamp;
                            } else if (segment.start !== undefined) {
                                timestamp = formatSecondsToTimestamp(segment.start);
                            } else if (segment.time !== undefined) {
                                timestamp = formatSecondsToTimestamp(segment.time);
                            } else {
                                timestamp = `[00:00:${String(index).padStart(2, '0')}]`;
                            }

                            return { speaker, timestamp, dialogue };
                        }),
                        speakerProfiles: [{ speaker: "SPEAKER 1", gender: "unknown" }],
                        detailedAnalysis: { sentenceComplexity: { readabilityScore: "N/A", wordsPerSentence: "N/A" }, keywordDensity: [] }
                    };
                } else if (parsedJson.length === 0) {
                    throw new Error("AI returned an empty array.");
                } else {
                    // Provide diagnostic information about what was actually received (§1.3)
                    const firstItemType = parsedJson[0] === null ? 'null' : typeof parsedJson[0];
                    const sampleData = parsedJson.slice(0, 2).map(item =>
                        typeof item === 'object' ? JSON.stringify(item).substring(0, 100) : String(item)
                    ).join(', ');
                    throw new Error(`AI returned a flat array with unexpected content type: ${firstItemType}. Sample: ${sampleData}`);
                }
            } else {
                throw new Error("AI response format is unexpected.");
            }

            if (!result || !result.transcription || result.transcription.length === 0) {
                 throw new Error("Processed transcription is empty.");
            }

            // Timestamp Validation and Normalization Step
            const timestamps = result.transcription.map(segment => segment.timestamp);
            
            // Heuristic to detect if timestamps include milliseconds
            const hasMilliseconds = timestamps.some(ts => {
                if (typeof ts !== 'string') return false;
                const parts = ts.replace(/[\[\]]/g, '').split(':');
                return parts.length === 3 && Number(parts[2]) > 59;
            });
            
            const timestampParser = (ts) => {
                if (typeof ts !== 'string') return -1;

                // Handle fallback "[Line N]" format from generic object array handler (§1.3)
                const lineMatch = ts.match(/\[Line\s+(\d+)\]/i);
                if (lineMatch) {
                    return parseInt(lineMatch[1], 10); // Treat line number as seconds
                }

                const parts = ts.replace(/[\[\]]/g, '').split(':').map(Number);
                if (parts.some(isNaN)) return -1;

                let seconds = 0;
                if (parts.length === 3) {
                    if (hasMilliseconds) { // MM:SS:ms format
                        seconds = parts[0] * 60 + parts[1] + parts[2] / 1000;
                    } else { // HH:MM:SS format
                        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                } else if (parts.length === 2) { // MM:SS
                    seconds = parts[0] * 60 + parts[1];
                } else if (parts.length === 1) { // S
                    seconds = parts[0];
                } else {
                    return -1;
                }
                return seconds;
            };
            
            let lastTimestampInSeconds = -1;
            const hasFallbackTimestamps = timestamps.some(ts => /\[Line\s+\d+\]/i.test(ts));

            for (const segment of result.transcription) {
                // Defensive validation: Check for missing/undefined timestamps (§1.3)
                if (!segment.timestamp || typeof segment.timestamp !== 'string') {
                    const segmentInfo = `Speaker: ${segment.speaker || 'unknown'}, Dialogue: "${(segment.dialogue || '').substring(0, 50)}${segment.dialogue?.length > 50 ? '...' : ''}"`;
                    throw new Error(`Missing or invalid timestamp in transcription segment. ${segmentInfo}. AI returned incomplete data.`);
                }

                const currentTimestampInSeconds = timestampParser(segment.timestamp);
                if (currentTimestampInSeconds === -1) {
                    throw new Error(`Invalid timestamp format detected: "${segment.timestamp}"`);
                }

                // Skip sequential validation for fallback timestamps (§1.3)
                if (!hasFallbackTimestamps && currentTimestampInSeconds < lastTimestampInSeconds) {
                    throw new Error(`Non-sequential timestamp detected. "${segment.timestamp}" appears before a previous timestamp (prev: ${lastTimestampInSeconds}s, curr: ${currentTimestampInSeconds}s).`);
                }
                lastTimestampInSeconds = currentTimestampInSeconds;
            }
            updateFile(fileObj.id, { progress: 98 });

            const voiceMap = {};
            let maleVoiceIndex = 0, femaleVoiceIndex = 0;
            result.speakerProfiles?.forEach(profile => {
                if (profile.gender?.toLowerCase() === 'female') { voiceMap[profile.speaker] = FEMALE_VOICES[femaleVoiceIndex++ % FEMALE_VOICES.length]; }
                else { voiceMap[profile.speaker] = MALE_VOICES[maleVoiceIndex++ % MALE_VOICES.length]; }
            });
            
            const finalResult = { ...result, voiceMap, waveformData, duration: lastTimestampInSeconds, timestamp: new Date().toISOString(), filename: fileObj.name, modelUsed: displayModelName, displayTranscription: result.transcription, displayLanguage: 'Original', translations: {}, processingTier: tier };
            updateFile(fileObj.id, { status: 'completed', result: finalResult, progress: 100 });
        } catch (err) {
            console.error('Transcription Error:', err);
            const categorized = categorizeError(err);
            updateFile(fileObj.id, {
                status: 'error',
                error: categorized.userMessage,
                errorSuggestion: categorized.suggestion,
                canRetry: categorized.canRetry,
                progress: 0
            });
        } finally {
            // Ensure progress interval is cleaned up
            if (progressIntervalsRef.current[fileObj.id]) {
                clearInterval(progressIntervalsRef.current[fileObj.id]);
                delete progressIntervalsRef.current[fileObj.id];
            }
        }
    };
    
    const handleTranslate = async (fileId, language) => {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.result) return;
        const { result } = file;
        if (language === 'Original') {
            updateFile(fileId, { result: { ...result, displayTranscription: result.transcription, displayLanguage: 'Original', ttsError: null } });
            return;
        }
        if (result.translations[language]) {
            updateFile(fileId, { result: { ...result, displayTranscription: result.translations[language], displayLanguage: language, ttsError: null } });
            return;
        }
        
        updateFile(fileId, { result: { ...result, isTranslating: true, ttsError: null, translationProgress: 0 } });

        // Use ref-based progress tracking to prevent race conditions
        const simulateProgress = () => {
            // Clear any existing interval for this file's translation
            const translationKey = `${fileId}_translation`;
            if (progressIntervalsRef.current[translationKey]) {
                clearInterval(progressIntervalsRef.current[translationKey]);
            }

            progressIntervalsRef.current[translationKey] = setInterval(() => {
                setFiles(prevFiles => prevFiles.map(f => {
                    if (f.id === fileId && f.result.isTranslating) {
                        const currentProgress = f.result.translationProgress || 0;
                        let increment = 0;
                        if (currentProgress < 60) increment = Math.random() * 4 + 2;
                        else if (currentProgress < 90) increment = Math.random() * 2 + 1;
                        else increment = Math.random() * 0.5 + 0.2;
                        const newProgress = Math.min(currentProgress + increment, 95);
                        return { ...f, result: { ...f.result, translationProgress: Math.round(newProgress) } };
                    }
                    return f;
                }));
            }, 200);
        };
        simulateProgress();

        try {
            // Validate API key before translation
            const apiKeyValidation = validateApiKey();
            if (!apiKeyValidation.valid) {
                throw new Error(apiKeyValidation.error);
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const originalText = result.transcription.map(t => `${t.timestamp} ${t.speaker}: ${t.dialogue}`).join('\n');
            const prompt = `Translate the following transcript into ${language}. IMPORTANT: Preserve the original speaker labels and timestamps exactly as they appear on each line. Return ONLY the translated transcript in the same line-by-line format.`;

            // Add timeout to translation request
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Translation request timeout after 60 seconds')), 60000)
            );

            const apiPromise = ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `${prompt}\n\n${originalText}` });
            const response = await Promise.race([apiPromise, timeoutPromise]);

            if (!response || !response.text) {
                throw new Error("Translation API returned an empty response.");
            }

            const translatedText = response.text;
            const originalTranscription = result.transcription;
            const translatedLines = translatedText.split('\n').map(line => line.trim()).filter(Boolean);
            let translatedTranscription = [];

            if (translatedLines.length > 0 && translatedLines.length === originalTranscription.length) {
                const hasFormatting = translatedLines.some(line => line.startsWith('[') && line.includes(':'));
                if (!hasFormatting) {
                    console.warn("AI translation response formatting was inconsistent. Aligning lines.");
                    translatedTranscription = originalTranscription.map((segment, index) => ({
                        ...segment,
                        dialogue: translatedLines[index] || segment.dialogue
                    }));
                }
            }

            if (translatedTranscription.length === 0 && translatedLines.length > 0) {
                 translatedTranscription = translatedLines.map(line => {
                    const match = line.match(/^(\[.*?\])\s(.*?):\s(.*)$/);
                    if (match) return { timestamp: match[1], speaker: match[2], dialogue: match[3] };
                    return null;
                }).filter(Boolean);
            }

            if (translatedTranscription.length === 0) {
                throw new Error("Parsed translation is empty. The AI may have returned an unexpected format.");
            }

            const newTranslations = { ...result.translations, [language]: translatedTranscription };
            updateFile(fileId, {
                result: {
                    ...result,
                    displayTranscription: translatedTranscription,
                    displayLanguage: language,
                    translations: newTranslations,
                    isTranslating: false,
                    translationProgress: 100
                }
            });
        } catch (error) {
            console.error("Translation Error:", error);
            const categorized = categorizeError(error);
            updateFile(fileId, {
                result: {
                    ...result,
                    displayTranscription: result.transcription,
                    displayLanguage: 'Original',
                    translationError: categorized.userMessage,
                    translationErrorSuggestion: categorized.suggestion,
                    isTranslating: false,
                    translationProgress: 0
                }
            });
        } finally {
            // Ensure translation progress interval is cleaned up
            const translationKey = `${fileId}_translation`;
            if (progressIntervalsRef.current[translationKey]) {
                clearInterval(progressIntervalsRef.current[translationKey]);
                delete progressIntervalsRef.current[translationKey];
            }
        }
    };
    
    const handleGenerateSummary = async (fileId) => {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.result) return;
        updateFile(fileId, { result: { ...file.result, isSummarizing: true } });
        try {
            // Validate API key
            const apiKeyValidation = validateApiKey();
            if (!apiKeyValidation.valid) {
                throw new Error(apiKeyValidation.error);
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const transcriptText = file.result.transcription.map(t => `${t.speaker}: ${t.dialogue}`).join('\n');
            const prompt = `Provide a concise, professional summary of the following transcript. Focus on the main topics and key decisions made. The summary should be a single paragraph.`;

            // Add timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Summary generation timeout after 45 seconds')), 45000)
            );

            const apiPromise = ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `${prompt}\n\n${transcriptText}` });
            const response = await Promise.race([apiPromise, timeoutPromise]);

            if (!response || !response.text) {
                throw new Error("Summary API returned an empty response.");
            }

            updateFile(fileId, { result: { ...file.result, summary: response.text, isSummarizing: false } });
        } catch (error) {
            console.error("Summary Generation Error:", error);
            const categorized = categorizeError(error);
            updateFile(fileId, {
                result: {
                    ...file.result,
                    summary: `Error: ${categorized.userMessage}`,
                    summarySuggestion: categorized.suggestion,
                    isSummarizing: false
                }
            });
        }
    };

    const handleExtractActionItems = async (fileId) => {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.result) return;
        updateFile(fileId, { result: { ...file.result, isExtracting: true } });
        try {
            // Validate API key
            const apiKeyValidation = validateApiKey();
            if (!apiKeyValidation.valid) {
                throw new Error(apiKeyValidation.error);
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const transcriptText = file.result.transcription.map(t => `${t.speaker}: ${t.dialogue}`).join('\n');
            const prompt = `Analyze the following transcript and extract all specific action items. For each action item, identify the task, who is assigned to it (if mentioned), and any deadlines. Present the result as a clear, bulleted list. If no action items are found, respond with 'No action items identified.'`;

            // Add timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Action item extraction timeout after 45 seconds')), 45000)
            );

            const apiPromise = ai.models.generateContent({ model: 'gemini-2.5-pro', contents: `${prompt}\n\n${transcriptText}` });
            const response = await Promise.race([apiPromise, timeoutPromise]);

            if (!response || !response.text) {
                throw new Error("Action items API returned an empty response.");
            }

            const items = response.text.split('\n').filter(line => line.trim() !== '' && line.trim() !== 'No action items identified.');
            updateFile(fileId, { result: { ...file.result, actionItems: items.length > 0 ? items : ['No action items identified.'], isExtracting: false } });
        } catch (error) {
            console.error("Action Item Extraction Error:", error);
            const categorized = categorizeError(error);
            updateFile(fileId, {
                result: {
                    ...file.result,
                    actionItems: [`Error: ${categorized.userMessage}`],
                    actionItemsSuggestion: categorized.suggestion,
                    isExtracting: false
                }
            });
        }
    };

    const handleToggleTidiedView = async (fileId) => {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.result) return;
    
        let resultUpdate = { ...file.result };
    
        if (resultUpdate.displayLanguage !== 'Original') {
            resultUpdate.displayLanguage = 'Original';
            resultUpdate.displayTranscription = resultUpdate.transcription;
        }
    
        const showTidied = !resultUpdate.showTidied;
        resultUpdate.showTidied = showTidied;
    
        if (showTidied && !resultUpdate.tidiedTranscription) {
            resultUpdate.isTidying = true;
            updateFile(fileId, { result: resultUpdate });

            try {
                // Validate API key
                const apiKeyValidation = validateApiKey();
                if (!apiKeyValidation.valid) {
                    throw new Error(apiKeyValidation.error);
                }

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const originalTranscript = file.result.transcription;
                const prompt = `Tidy up the following transcript by removing filler words (like 'um', 'uh', 'you know'), repeated words, and stutters. Do not change the core meaning or the sentence structure. Return ONLY the tidied dialogue for each segment in the exact same JSON format as the input, including speaker and timestamp. Ensure the output is a valid JSON array.`;

                // Add timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Tidied view generation timeout after 60 seconds')), 60000)
                );

                const apiPromise = ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `${prompt}\n\n${JSON.stringify(originalTranscript, null, 2)}`,
                    config: { responseMimeType: 'application/json' }
                });

                const response = await Promise.race([apiPromise, timeoutPromise]);

                if (!response || !response.text) {
                    throw new Error("Tidied view API returned an empty response.");
                }

                const tidiedJson = JSON.parse(response.text.replace(/```json|```/g, '').trim());

                if (!Array.isArray(tidiedJson) || tidiedJson.length !== originalTranscript.length) {
                    throw new Error("Tidied response from AI was not a matching array. Expected same length as original.");
                }

                resultUpdate.tidiedTranscription = tidiedJson;
                resultUpdate.isTidying = false;
                updateFile(fileId, { result: resultUpdate });

            } catch (error) {
                console.error("Tidy Transcript Error:", error);
                const categorized = categorizeError(error);
                resultUpdate.showTidied = false;
                resultUpdate.isTidying = false;
                resultUpdate.tidiedError = categorized.userMessage;
                resultUpdate.tidiedErrorSuggestion = categorized.suggestion;
                updateFile(fileId, { result: resultUpdate });
            }
        } else {
            updateFile(fileId, { result: resultUpdate });
        }
    };

    const exportTranscription = async (fileId, options) => {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.result) {
            showToast("Could not find file data to export.", 'error');
            return;
        }

        const zip = new JSZip();
        const { result } = file;

        try {
            if (options.waveform && result.waveformData) {
                const svgString = generateWaveformSvg(result.waveformData);
                zip.file('Waveform.svg', svgString);
            }

            if (result.processingTier === 'Legal') {
                if (options.transcript) {
                    const doc = generateLegalDoc(result);
                    const blob = await Packer.toBlob(doc);
                    zip.file(`Legal_Transcript_${result.filename.replace(/\.[^/.]+$/, "")}.docx`, blob);
                }
            } else {
                if (options.transcript) {
                    const doc = generateStandardTranscriptDoc(result);
                    const blob = await Packer.toBlob(doc);
                    zip.file(`Transcript_${result.filename.replace(/\.[^/.]+$/, "")}.docx`, blob);
                }
                if (options.analysis && (result.detailedAnalysis || result.summary || result.actionItems)) {
                    const doc = generateAnalysisReportDoc(result);
                    const blob = await Packer.toBlob(doc);
                    zip.file(`Analysis_Report_${result.filename.replace(/\.[^/.]+$/, "")}.docx`, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `VCB_Export_${result.filename.replace(/\.[^/.]+$/, "")}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Export Error:", error);
            showToast(`An error occurred during export: ${error.message}`, 'error');
        }
    };
    
    const handleRemove = (id) => setFiles(prev => prev.filter(f => f.id !== id));
    const handleClearAll = () => setShowClearConfirm(true);
    const confirmClearAll = () => {
        setFiles([]);
        setShowClearConfirm(false);
        showToast('All files have been removed from the queue.', 'info');
    };
    const cancelClearAll = () => setShowClearConfirm(false);
    
    const completedFiles = files.filter(f => f.status === 'completed');
    const pendingFiles = files.filter(f => f.status !== 'completed');
    
    return (
        <div style={{ maxWidth: '1200px', margin: 'auto', padding: 'var(--spacing-7) var(--spacing-5)' }}>
            <AppHeader />
            <main style={{ display: 'grid', gap: 'var(--spacing-8)' }}>
                <UploadSection onFileSelect={handleFileSelect} onClearAll={handleClearAll} files={files} />
                
                <section>
                     <h2 className="section-title">Processing Queue & Results</h2>
                     {files.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-8) 0', border: '2px dashed var(--color-border)', borderRadius: 'var(--border-radius)', color: 'var(--color-on-surface-secondary)' }}>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Your queue is empty.</p>
                            <p style={{ margin: 'var(--spacing-2) 0 0 0' }}>Select files above to begin transcription.</p>
                        </div>
                     ) : (
                         <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
                             {pendingFiles.map(file => <FileItem key={file.id} file={file} onTranscribe={transcribeAudio} onRemove={handleRemove} />)}
                             {completedFiles.map(file => <ResultCard key={file.id} file={file} onExport={exportTranscription} onTranslate={handleTranslate} onUpdateFile={updateFile} audioContext={audioContextRef.current} onGenerateSummary={handleGenerateSummary} onExtractActionItems={handleExtractActionItems} onToggleTidiedView={handleToggleTidiedView} showToast={showToast} />)}
                         </div>
                     )}
                </section>
            </main>
            <footer style={{ textAlign: 'center', marginTop: 'var(--spacing-8)', paddingTop: 'var(--spacing-6)', borderTop: '1px solid var(--color-border)', fontSize: '14px', color: 'var(--color-on-surface-secondary)' }}>
                <p style={{ fontWeight: '600', color: 'var(--color-on-surface)', marginBottom: 'var(--spacing-4)' }}>
                    Privacy Commitment: We do not save your recordings or transcripts to any servers. Your session is preserved locally in your browser for your convenience.
                </p>
                <p>VCB AI Transcription Service • Enterprise V4.0 Premium</p>
                <p style={{ marginTop: 'var(--spacing-2)' }}>Powered by VCB-AI-Flash & VCB-AI-Pro models.</p>
            </footer>
             {saveStatus !== 'idle' && (
                <div className="save-status-indicator">
                    {saveStatus === 'saving' && <><SpinnerIcon /> Preserving session...</>}
                    {saveStatus === 'saved' && <><CheckIcon /> Session preserved locally</>}
                    {saveStatus === 'error' && 'Save error'}
                    {saveStatus === 'quota_exceeded' && 'Session storage full - cannot save'}
                </div>
            )}
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
            ))}
            {showClearConfirm && (
                <ConfirmDialog
                    message="Are you sure you want to clear all files? This will remove all completed transcriptions and pending uploads. This action cannot be undone."
                    onConfirm={confirmClearAll}
                    onCancel={cancelClearAll}
                />
            )}
        </div>
    );
};

// Wrap with ErrorBoundary for enterprise-grade error handling (§1.3, §8.1)
const VCBTranscriptionServiceWithErrorBoundary = () => (
    <ErrorBoundary>
        <VCBTranscriptionService />
    </ErrorBoundary>
);

export default VCBTranscriptionServiceWithErrorBoundary;
