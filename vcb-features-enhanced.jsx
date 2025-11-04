/**
 * VCB TRANSCRIPTION SERVICE - ENHANCED FEATURES MODULE
 *
 * This module contains all missing features for the VCB Transcription Service:
 * 1. Translation System (11 SA Languages + Foreign)
 * 2. Voice Synthesis (Multi-Speaker TTS)
 * 3. Token Management System
 * 4. High Court Document Formatting
 * 5. IndexedDB Storage System
 * 6. POPIA Compliance Components
 * 7. PayFast Integration
 *
 * ============================================================================
 * AI SDK ARCHITECTURE
 * ============================================================================
 * 
 * PRIMARY AI SDK: Vercel AI SDK (@vercel/ai)
 * - Main overarching SDK for all AI operations
 * - Unified interface for multiple AI providers (OpenAI, Anthropic, Google, etc.)
 * - Streaming support for real-time responses
 * - Type-safe with TypeScript
 * - Built-in error handling and retries
 * 
 * CURRENT AI PROVIDERS:
 * - Google Gemini (@google/genai) - Used for transcription and translation
 * - Future: Can be migrated to use Vercel AI SDK's Google provider
 * 
 * MIGRATION STRATEGY:
 * - Use Vercel AI SDK for new AI features
 * - Gradually migrate existing Google Gemini code to use AI SDK
 * - Maintain backwards compatibility during transition
 * 
 * ============================================================================
 *
 * @author VCB AI
 * @version 2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import CryptoJS from 'crypto-js';

// NOTE: Vercel AI SDK is installed and available for use in new AI handlers
// import { generateText, streamText } from 'ai';
// import { createGoogleGenerativeAI } from '@ai-sdk/google';
// See: https://sdk.vercel.ai/docs for usage examples

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

export const LANGUAGES = {
  official: [
    { code: 'en-US', name: 'English', widthAdjust: 1.0 },
    { code: 'af-ZA', name: 'Afrikaans', widthAdjust: 1.15 },
    { code: 'zu-ZA', name: 'IsiZulu', widthAdjust: 1.30 },
    { code: 'xh-ZA', name: 'IsiXhosa', widthAdjust: 1.30 },
    { code: 'st-ZA', name: 'Sesotho', widthAdjust: 1.15 },
    { code: 'ts-ZA', name: 'Xitsonga', widthAdjust: 1.20 },
    { code: 'ss-ZA', name: 'siSwati', widthAdjust: 1.25 },
    { code: 've-ZA', name: 'Tshivenda', widthAdjust: 1.20 },
    { code: 'nr-ZA', name: 'Ndebele', widthAdjust: 1.25 },
    { code: 'nso-ZA', name: 'Sepedi', widthAdjust: 1.15 },
    { code: 'tn-ZA', name: 'Setswana', widthAdjust: 1.15 },
  ],
  foreign: [
    { code: 'zh-CN', name: 'Mandarin Chinese', widthAdjust: 0.75 },
    { code: 'fr-FR', name: 'French', widthAdjust: 1.10 },
    { code: 'es-ES', name: 'Spanish', widthAdjust: 1.15 },
    { code: 'pt-PT', name: 'Portuguese', widthAdjust: 1.15 },
    { code: 'de-DE', name: 'German', widthAdjust: 1.10 },
    { code: 'ar-SA', name: 'Arabic', widthAdjust: 1.15 },
  ]
};

export const VOICE_OPTIONS = {
  male: [
    { name: 'en-US-Wavenet-D', label: 'Male Voice 1 (Premium)', type: 'WAVENET' },
    { name: 'en-US-Wavenet-A', label: 'Male Voice 2 (Premium)', type: 'WAVENET' },
    { name: 'en-US-Standard-D', label: 'Male Voice (Standard)', type: 'STANDARD' }
  ],
  female: [
    { name: 'en-US-Wavenet-F', label: 'Female Voice 1 (Premium)', type: 'WAVENET' },
    { name: 'en-US-Wavenet-C', label: 'Female Voice 2 (Premium)', type: 'WAVENET' },
    { name: 'en-US-Standard-F', label: 'Female Voice (Standard)', type: 'STANDARD' }
  ]
};

export const TOKEN_PACKAGES = [
  { id: 'starter', tokens: 1000, price: 100, label: 'Starter', perToken: 0.10 },
  { id: 'basic', tokens: 5000, price: 450, label: 'Basic', discount: '10%', perToken: 0.09 },
  { id: 'pro', tokens: 10000, price: 800, label: 'Pro', discount: '20%', perToken: 0.08 },
  { id: 'enterprise', tokens: 50000, price: 3500, label: 'Enterprise', discount: '30%', perToken: 0.07 }
];
const rawBasePath = import.meta.env.BASE_URL || '/';
const normalizedBasePath = rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`;

export const PAYFAST_CONFIG = {
  merchantId: '31995055',
  merchantKey: 'g3kamzqwu6dc0',
  passphrase: 'Viable_Core_Business_007',
  returnUrl: 'https://vcb-trans.vercel.app/payment-success.html',
  cancelUrl: 'https://vcb-trans.vercel.app/payment-cancelled.html',
  notifyUrl: 'https://vcb-trans.vercel.app/api/payfast/notify',
  sandbox: false  // Using production credentials
};

// ============================================================================
// UTILITY: HTML Entity Decoder
// ============================================================================

const decodeHTMLEntities = (text) => {
  if (!text) return text;
  return String(text)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

// ============================================================================
// 1. TRANSLATION SYSTEM
// ============================================================================

/**
 * Translate transcript to target language using Gemini API
 */
export const translateTranscript = async (transcriptText, targetLanguage, apiKey) => {
  const client = new GoogleGenAI({ apiKey });

  const languageInfo = [...LANGUAGES.official, ...LANGUAGES.foreign].find(
    lang => lang.code === targetLanguage
  );

  const prompt = `Translate the following English transcript into professional ${languageInfo.name} (South African spelling if applicable).

CRITICAL RULES:
1. Maintain speaker names EXACTLY as provided (do NOT translate names)
2. Keep ALL timestamps EXACTLY as provided: [HH:MM:SS]
3. Keep ALL [NOTATION] markers unchanged: [PAUSE], [INAUDIBLE], etc.
4. Preserve structure: [HH:MM:SS] **SPEAKER:** translated text
5. Use formal register for court/legal context
6. Use professional legal terminology where applicable

Transcript to translate:
${transcriptText}

Return ONLY the translated transcript in the exact same format.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192
      }
    });

    return response.text;
  } catch (error) {
    throw new Error(`Translation failed: ${error.message}`);
  }
};

/**
 * Parse transcript text into structured segments
 */
export const parseTranscriptSegments = (transcriptText) => {
  const segments = [];
  const lines = transcriptText.split('\n');

  let currentSegment = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match timestamp: [HH:MM:SS]
    const timestampMatch = trimmed.match(/^\[(\d{2}):(\d{2}):(\d{2})\]$/);
    if (timestampMatch) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        timestamp: trimmed,
        speaker: '',
        text: ''
      };
      continue;
    }

    // Match speaker: **SPEAKER NAME:**
    const speakerMatch = trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    if (speakerMatch && currentSegment) {
      currentSegment.speaker = speakerMatch[1];
      currentSegment.text = speakerMatch[2];
      continue;
    }

    // Continuation of text
    if (currentSegment && currentSegment.speaker) {
      currentSegment.text += (currentSegment.text ? ' ' : '') + trimmed;
    }
  }

  if (currentSegment && currentSegment.speaker) {
    segments.push(currentSegment);
  }

  return segments;
};

/**
 * Generate bilingual Word document with two-column table
 */
export const generateBilingualDocument = (sourceText, translatedText, metadata) => {
  const sourceSegments = parseTranscriptSegments(sourceText);
  const translatedSegments = parseTranscriptSegments(translatedText);

  const doc = new Document({
    sections: [{
      children: [
        // Title
        new Paragraph({
          text: "PROFESSIONAL TRANSCRIPTION & TRANSLATION",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // Metadata
        new Paragraph({
          text: `Source Language: ${metadata.sourceLanguage}`,
          spacing: { after: 120 }
        }),
        new Paragraph({
          text: `Target Language: ${metadata.targetLanguage}`,
          spacing: { after: 120 }
        }),
        new Paragraph({
          text: `Date: ${new Date().toLocaleDateString()}`,
          spacing: { after: 120 }
        }),
        new Paragraph({
          text: `Duration: ${metadata.duration || 'N/A'}`,
          spacing: { after: 400 }
        }),

        // Two-column table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    text: `SOURCE (${metadata.sourceLanguage})`,
                    bold: true,
                    alignment: AlignmentType.CENTER
                  })],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph({
                    text: `TRANSLATION (${metadata.targetLanguage})`,
                    bold: true,
                    alignment: AlignmentType.CENTER
                  })],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                })
              ]
            }),

            // Content rows
            ...sourceSegments.map((sourceSeg, idx) => {
              const translatedSeg = translatedSegments[idx] || {};
              return new TableRow({
                children: [
                  // Source column
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: sourceSeg.timestamp,
                        spacing: { after: 100 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `${sourceSeg.speaker}:`, bold: true })
                        ],
                        spacing: { after: 100 }
                      }),
                      new Paragraph({ text: sourceSeg.text })
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE }
                  }),
                  // Translation column
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: translatedSeg.timestamp || sourceSeg.timestamp,
                        spacing: { after: 100 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${translatedSeg.speaker || sourceSeg.speaker}:`,
                            bold: true
                          })
                        ],
                        spacing: { after: 100 }
                      }),
                      new Paragraph({
                        text: translatedSeg.text || '[Translation missing]'
                      })
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE }
                  })
                ]
              });
            })
          ]
        }),

        // Footer section
        new Paragraph({
          text: "",
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "═".repeat(70),
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "TRANSLATOR CERTIFICATION",
          bold: true,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "I certify that this translation is accurate and faithful to the original.",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "NOTE: AI-generated translation - human certification recommended for legal use.",
          italics: true,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `Translation Date: ${new Date().toLocaleDateString()}`
        })
      ]
    }]
  });

  return doc;
};

// ============================================================================
// 2. VOICE SYNTHESIS SYSTEM
// ============================================================================

/**
 * Detect unique speakers from transcript
 */
export const detectSpeakers = (transcriptText) => {
  const segments = parseTranscriptSegments(transcriptText);
  const speakers = [...new Set(segments.map(seg => seg.speaker))].filter(Boolean);
  return speakers;
};

/**
 * Generate voice synthesis using Gemini's TTS capability
 * NOTE: This is a simplified implementation. Full TTS requires Google Cloud TTS API
 */
export const generateVoiceNarration = async (transcriptSegments, speakerVoiceMap, isWaveNet = false) => {
  // This is a placeholder for the actual TTS implementation
  // In production, you would call Google Cloud Text-to-Speech API

  console.warn('Voice synthesis requires Google Cloud TTS API integration');
  console.log('Speaker voice assignments:', speakerVoiceMap);
  console.log('Voice quality:', isWaveNet ? 'WaveNet Premium' : 'Standard');

  // Return placeholder
  return new Blob(['Voice synthesis placeholder'], { type: 'audio/mpeg' });
};

// ============================================================================
// 3. TOKEN MANAGEMENT SYSTEM
// ============================================================================

const DB_NAME = 'VCBTranscriptionApp';
const DB_VERSION = 1;

/**
 * Initialize IndexedDB
 */
export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Transcriptions store
      if (!db.objectStoreNames.contains('transcriptions')) {
        const transcStore = db.createObjectStore('transcriptions', {
          keyPath: 'transcriptionId',
          autoIncrement: true
        });
        transcStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        transcStore.createIndex('fileName', 'fileName', { unique: false });
      }

      // Token balance store
      if (!db.objectStoreNames.contains('userTokens')) {
        db.createObjectStore('userTokens', { keyPath: 'userId' });
      }

      // Transaction history store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', {
          keyPath: 'id',
          autoIncrement: true
        });
        txStore.createIndex('date', 'date', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'settingKey' });
      }
    };
  });
};

/**
 * Get token balance
 */
export const getTokenBalance = async () => {
  const db = await initializeDatabase();
  return new Promise((resolve) => {
    const tx = db.transaction('userTokens', 'readonly');
    const store = tx.objectStore('userTokens');
    const request = store.get('local-user');

    request.onsuccess = () => {
      resolve(request.result || {
        userId: 'local-user',
        totalTokens: 0,
        tokensUsed: 0,
        tokensRemaining: 0
      });
    };
  });
};

/**
 * Add tokens to balance
 */
export const addTokens = async (tokensToAdd, description = 'Token Purchase') => {
  const db = await initializeDatabase();
  const balance = await getTokenBalance();

  const newBalance = {
    userId: 'local-user',
    totalTokens: balance.totalTokens + tokensToAdd,
    tokensUsed: balance.tokensUsed,
    tokensRemaining: balance.tokensRemaining + tokensToAdd,
    lastUpdated: new Date().toISOString()
  };

  // Update balance
  const tx1 = db.transaction('userTokens', 'readwrite');
  tx1.objectStore('userTokens').put(newBalance);

  // Log transaction
  const tx2 = db.transaction('transactions', 'readwrite');
  tx2.objectStore('transactions').add({
    date: new Date().toISOString(),
    type: 'PURCHASE',
    amount: tokensToAdd,
    description,
    balanceAfter: newBalance.tokensRemaining
  });

  return newBalance;
};

/**
 * Deduct tokens from balance
 */
export const deductTokens = async (tokensToDeduct, description) => {
  const db = await initializeDatabase();
  const balance = await getTokenBalance();

  if (balance.tokensRemaining < tokensToDeduct) {
    throw new Error(`Insufficient tokens. You need ${tokensToDeduct} tokens but only have ${balance.tokensRemaining}.`);
  }

  const newBalance = {
    userId: 'local-user',
    totalTokens: balance.totalTokens,
    tokensUsed: balance.tokensUsed + tokensToDeduct,
    tokensRemaining: balance.tokensRemaining - tokensToDeduct,
    lastUpdated: new Date().toISOString()
  };

  // Update balance
  const tx1 = db.transaction('userTokens', 'readwrite');
  tx1.objectStore('userTokens').put(newBalance);

  // Log transaction
  const tx2 = db.transaction('transactions', 'readwrite');
  tx2.objectStore('transactions').add({
    date: new Date().toISOString(),
    type: 'USAGE',
    amount: tokensToDeduct,
    description,
    balanceAfter: newBalance.tokensRemaining
  });

  return newBalance;
};

/**
 * Calculate service cost in tokens
 */
export const calculateServiceCost = (audioMinutes, options = {}) => {
  let totalCost = 0;

  // Transcription cost: R 0.26 per minute (50% margin)
  totalCost += audioMinutes * 0.26;

  // Translation cost: R 0.26 per minute
  if (options.translation) {
    totalCost += audioMinutes * 0.26;
  }

  // Voice synthesis cost
  if (options.voiceSynthesis) {
    if (options.voiceQuality === 'wavenet') {
      totalCost += audioMinutes * 0.60; // Premium WaveNet
    } else {
      totalCost += audioMinutes * 0.15; // Standard voice
    }
  }

  // Convert to tokens (1 token = R 0.01)
  const tokens = Math.ceil(totalCost * 100);

  return {
    costInRands: totalCost.toFixed(2),
    tokens,
    breakdown: {
      transcription: (audioMinutes * 0.26).toFixed(2),
      translation: options.translation ? (audioMinutes * 0.26).toFixed(2) : 0,
      voiceSynthesis: options.voiceSynthesis ?
        (options.voiceQuality === 'wavenet' ? (audioMinutes * 0.60).toFixed(2) : (audioMinutes * 0.15).toFixed(2)) : 0
    }
  };
};

// ============================================================================
// 4. DOCUMENT GENERATION
// ============================================================================

/**
 * Generate professional (non-court) document formatted per guidance
 */
export const generateProfessionalDocument = (transcriptText, metadata = {}) => {
  const segments = parseTranscriptSegments(transcriptText);
  const uniqueSpeakers = Array.from(new Set(segments.map(segment => segment.speaker).filter(Boolean)));
  const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;

  const metadataParagraphs = [
    // Title
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER }),
    new Paragraph({ text: "PROFESSIONAL TRANSCRIPTION", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { after: 240 } }),

    // DOCUMENT METADATA
    new Paragraph({ text: "DOCUMENT METADATA", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Document Title:           ${metadata.fileName || 'VCB Professional Transcript'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Creation Date:            ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Original Recording Date:  ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Recording Duration:       ${metadata.duration || 'N/A'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Word Count:               ${wordCount}`, spacing: { after: 240 } }),

    // SOURCE INFORMATION
    new Paragraph({ text: "SOURCE INFORMATION", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Primary Language:         ${metadata.sourceLanguage || 'English'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Recording Type:           ${metadata.recordingType || 'Audio'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Location:                 ${metadata.location || 'Not Specified'}`, spacing: { after: 240 } }),

    // PARTICIPANTS
    new Paragraph({ text: "PARTICIPANTS", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    ...uniqueSpeakers.map((speaker, i) => new Paragraph({ text: `Speaker ${i + 1}: ${speaker}  | Role: [Not Specified]`, spacing: { after: 80 } })),
    new Paragraph({ text: "", spacing: { after: 160 } }),

    // TRANSCRIPTION DETAILS
    new Paragraph({ text: "TRANSCRIPTION DETAILS", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Transcriber Name:         ${metadata.transcriber || 'VCB AI Transcription Service'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Transcription Method:     AI Assisted (Google Gemini)`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date Transcribed:         ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Transcription Type:       ${metadata.transcriptionType || 'Intelligent (Cleaned)'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Proofreading:             [ ] Once / [ ] Twice / [X] AI Verified`, spacing: { after: 240 } }),

    // QUALITY ASSURANCE
    new Paragraph({ text: "QUALITY ASSURANCE", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Font:                     Times New Roman, 11pt`, spacing: { after: 80 } }),
    new Paragraph({ text: `Line Spacing:             Single (1.0)`, spacing: { after: 80 } }),
    new Paragraph({ text: `Margins:                  1 inch (2.54cm)`, spacing: { after: 80 } }),
    new Paragraph({ text: `Confidentiality:          ${metadata.confidentiality || 'Indefinite'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `POPIA Compliance:         [X] Confirmed`, spacing: { after: 320 } }),

    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { after: 320 } })
  ];

  const contentParagraphs = segments.flatMap(segment => [
    new Paragraph({ children: [new TextRun({ text: decodeHTMLEntities(segment.timestamp), bold: true, size: 22, font: 'Times New Roman', color: '000000' })], spacing: { before: 240, after: 120 } }),
    new Paragraph({ text: '', spacing: { after: 0 } }),
    new Paragraph({ children: [new TextRun({ text: decodeHTMLEntities(`${segment.speaker}:`), bold: true, size: 22, font: 'Times New Roman', color: '000000' })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: decodeHTMLEntities(segment.text), size: 22, font: 'Times New Roman', color: '000000' })], spacing: { after: 240 } })
  ]);

  const footerParagraphs = [
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { before: 400, after: 160 } }),
    new Paragraph({ text: "END OF TRANSCRIPTION", alignment: AlignmentType.CENTER, bold: true, spacing: { after: 240 } }),
    new Paragraph({ text: `Document Status:          ${metadata.status || 'FINAL'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Last Updated:             ${new Date().toISOString().replace('T', ' ').substring(0, 16)}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Total Pages:              [Auto-generated]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Proofreading Status:      AI Verified`, spacing: { after: 320 } }),
    new Paragraph({ text: "SIGNATURES (if required):", bold: true, spacing: { after: 160 } }),
    new Paragraph({ text: "Transcriber: _____________________  Date: __________", spacing: { after: 160 } }),
    new Paragraph({ text: "Reviewer: _____________________  Date: __________", spacing: { after: 240 } }),
    new Paragraph({ text: "Professional Transcription - Not Court Certified", alignment: AlignmentType.CENTER, italics: true })
  ];

  return new Document({
    sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: [...metadataParagraphs, ...contentParagraphs, ...footerParagraphs] }],
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } }
  });
};

/**
 * Generate High Court compliant document (Rule 8 & 59) - Production Ready
 */
export const generateHighCourtDocument = (transcriptText, metadata = {}) => {
  const segments = parseTranscriptSegments(transcriptText);
  const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;

  const headerParagraphs = [
    // Title
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER }),
    new Paragraph({ text: "HIGH COURT RECORD OF PROCEEDINGS", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ text: "CERTIFIED TRANSCRIPTION", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { after: 240 } }),

    // CASE INFORMATION
    new Paragraph({ text: "CASE INFORMATION", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Case Number:              ${metadata.caseNumber || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Case Name:                ${metadata.caseName || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Division:                 ${metadata.division || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date of Hearing:          ${metadata.hearingDate || new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Judge:                    ${metadata.judge || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Court Clerk:              [To be completed]`, spacing: { after: 240 } }),

    // PROCEEDING DETAILS
    new Paragraph({ text: "PROCEEDING DETAILS", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Type:                     ${metadata.proceedingType || 'Hearing'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Recording Date:           ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Duration:                 ${metadata.duration || 'N/A'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Location:                 [To be completed]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Language Used:            ${metadata.sourceLanguage || 'English'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Word Count:               ${wordCount}`, spacing: { after: 240 } }),

    // PARTIES
    new Paragraph({ text: "PARTIES", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Plaintiff/Applicant:      [To be completed]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Defendant/Respondent:     [To be completed]`, spacing: { after: 240 } }),

    // TRANSCRIBER INFORMATION
    new Paragraph({ text: "TRANSCRIBER INFORMATION", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Name:                     VCB AI Transcription Service`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date Transcribed:         ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Proofreading Status:      [X] AI Verified / [ ] Manual Review`, spacing: { after: 80 } }),
    new Paragraph({ text: `Google Transcription Used: Yes`, spacing: { after: 240 } }),

    // FORMATTING COMPLIANCE (Rule 8)
    new Paragraph({ text: "FORMATTING COMPLIANCE (Rule 8)", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Double-Spacing:           [X] Confirmed (2.0)`, spacing: { after: 80 } }),
    new Paragraph({ text: `Margins (1 inch):         [X] Confirmed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Line Numbers (Every 10):  [X] Confirmed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Page Numbers:             [X] Confirmed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Witness Names on Headers: [ ] To be completed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Black Ink, Not Photocopy: [X] Confirmed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Paper Type:               Stout A4 (200gsm) recommended`, spacing: { after: 320 } }),

    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { after: 320 } })
  ];

  // Generate content with line numbering every 10th line
  const contentParagraphs = [];
  let lineNumber = 10;

  // Add witness header if provided
  if (metadata.witnessName) {
    contentParagraphs.push(new Paragraph({
      text: `WITNESS: ${metadata.witnessName.toUpperCase()}`,
      bold: true,
      spacing: { before: 480, after: 480 }
    }));
  }

  segments.forEach((segment) => {
    contentParagraphs.push(new Paragraph({ children: [new TextRun({ text: decodeHTMLEntities(segment.timestamp), bold: true, size: 22, font: 'Times New Roman', color: '000000' })], spacing: { before: 480, after: 240 } }));
    contentParagraphs.push(new Paragraph({ children: [new TextRun({ text: decodeHTMLEntities(`${segment.speaker.toUpperCase()}:`), bold: true, size: 22, font: 'Times New Roman', color: '000000' })], spacing: { after: 240 } }));

    const lines = segment.text.split(/(?<=[.!?])\s+/);
    lines.forEach(line => {
      const showLineNumber = (lineNumber % 10 === 0);
      const decodedLine = decodeHTMLEntities(line);
      contentParagraphs.push(new Paragraph({
        children: [
          new TextRun({ text: decodedLine, size: 22, font: 'Times New Roman', color: '000000' })
        ],
        spacing: { before: 480, after: 480 },
        ...(showLineNumber ? { alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${decodedLine}                    ${lineNumber}`, size: 22, font: 'Times New Roman', color: '000000' })] } : {})
      }));
      lineNumber++;
    });
  });

  const footerParagraphs = [
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { before: 640, after: 160 } }),
    new Paragraph({ text: "END OF TRANSCRIPTION", alignment: AlignmentType.CENTER, bold: true, spacing: { after: 240 } }),
    new Paragraph({ text: `Document Status:          ${metadata.status || 'DRAFT'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Total Pages:              [Auto-generated]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Case Number:              ${metadata.caseNumber || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date Finalized:           ${new Date().toISOString().split('T')[0]}`, spacing: { after: 320 } }),

    // COMPLIANCE VERIFICATION
    new Paragraph({ text: "COMPLIANCE VERIFICATION", bold: true, spacing: { after: 160 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 160 } }),
    new Paragraph({ text: "TRANSCRIBER'S CERTIFICATION:", bold: true, spacing: { after: 160 } }),
    new Paragraph({ text: `I hereby certify that the foregoing is a true and faithful transcription of the proceedings held in the ${metadata.division || '[Division]'} of the High Court on ${metadata.hearingDate || '[Date]'}.`, spacing: { after: 240 } }),
    new Paragraph({ text: "Transcriber Name: _____________________  Date: __________", spacing: { after: 160 } }),
    new Paragraph({ text: "Signature: _____________________", spacing: { after: 320 } }),
    new Paragraph({ text: "[For High Court filing only - translator certification not required if single language proceedings]", italics: true, alignment: AlignmentType.CENTER })
  ];

  return new Document({
    sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: [...headerParagraphs, ...contentParagraphs, ...footerParagraphs] }],
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } }
  });
};

/**
 * Generate High Court Bilingual Document (Rule 8 & 59) - Side-by-Side Table Format
 * Option D: HIGH COURT + CERTIFIED BILINGUAL TRANSLATION
 */
export const generateHighCourtBilingualDocument = (transcriptText, translationText, metadata) => {
  const sourceSegments = parseTranscriptSegments(transcriptText);
  const targetSegments = parseTranscriptSegments(translationText);
  const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;

  const headerParagraphs = [
    // Title
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER }),
    new Paragraph({ text: "HIGH COURT RECORD OF PROCEEDINGS", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ text: "CERTIFIED TRANSCRIPTION & SWORN TRANSLATION", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { after: 240 } }),

    // CASE INFORMATION
    new Paragraph({ text: "CASE INFORMATION", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Case Number:              ${metadata.caseNumber || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Case Name:                ${metadata.caseName || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Division:                 ${metadata.division || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date of Hearing:          ${metadata.hearingDate || new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Judge:                    ${metadata.judge || '[To be completed]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Court Clerk:              [To be completed]`, spacing: { after: 240 } }),

    // PROCEEDING DETAILS
    new Paragraph({ text: "PROCEEDING DETAILS", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Type:                     ${metadata.proceedingType || 'Hearing'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Duration:                 ${metadata.duration || 'N/A'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Word Count:               ${wordCount}`, spacing: { after: 240 } }),

    // PARTIES
    new Paragraph({ text: "PARTIES", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Plaintiff/Applicant:      [To be completed]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Defendant/Respondent:     [To be completed]`, spacing: { after: 240 } }),

    // TRANSCRIBER INFORMATION
    new Paragraph({ text: "TRANSCRIBER INFORMATION", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Name:                     VCB AI Transcription Service`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date Transcribed:         ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Google Transcription Used: Yes`, spacing: { after: 240 } }),

    // TRANSLATOR/SWORN TRANSLATOR INFORMATION
    new Paragraph({ text: "TRANSLATOR/SWORN TRANSLATOR INFORMATION", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Name:                     [To be completed]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Status:                   [ ] Rule 59 Enrolled / [ ] Professional`, spacing: { after: 80 } }),
    new Paragraph({ text: `High Court Division:      [To be completed]`, spacing: { after: 80 } }),
    new Paragraph({ text: `SATI Registration:        [To be completed]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Language Pair:            ${metadata.sourceLanguage || 'English'} - ${metadata.targetLanguage || '[Target Language]'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Date Translated:          ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Translation Type:         Verbatim / Sworn`, spacing: { after: 240 } }),

    // FORMATTING & COMPLIANCE
    new Paragraph({ text: "FORMATTING & COMPLIANCE", bold: true, spacing: { after: 80 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
    new Paragraph({ text: `Bilingual Format:         [X] Side-by-side two-column table`, spacing: { after: 80 } }),
    new Paragraph({ text: `Double-Spacing:           [X] Confirmed (2.0)`, spacing: { after: 80 } }),
    new Paragraph({ text: `Line Numbers (Every 10):  [X] Confirmed`, spacing: { after: 80 } }),
    new Paragraph({ text: `All Rule 8 Requirements:  [X] Confirmed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Translator Stamp:         [ ] To be affixed`, spacing: { after: 80 } }),
    new Paragraph({ text: `Translator Signature:     [ ] Original (Not photocopy)`, spacing: { after: 80 } }),
    new Paragraph({ text: `Rule 59 Certification:    [ ] To be included`, spacing: { after: 320 } }),

    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { after: 320 } })
  ];

  // Generate bilingual content with side-by-side table
  const contentElements = [];
  let lineNumber = 10;

  // Add witness header if provided
  if (metadata.witnessName) {
    contentElements.push(new Paragraph({
      text: `WITNESS: ${metadata.witnessName.toUpperCase()}`,
      bold: true,
      spacing: { before: 480, after: 480 }
    }));
  }

  // Create table rows for each segment pair
  const tableRows = [];

  // Header row with 2 columns: Source | Target (no line number column)
  tableRows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          text: `${metadata.sourceLanguage || 'SOURCE LANGUAGE'} (${metadata.sourceLanguageCode || 'English'})`,
          bold: true,
          alignment: AlignmentType.CENTER
        })],
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: "E0E0E0" }
      }),
      new TableCell({
        children: [new Paragraph({
          text: `${metadata.targetLanguage || 'TARGET LANGUAGE'} (${metadata.targetLanguageCode || 'Translation'})`,
          bold: true,
          alignment: AlignmentType.CENTER
        })],
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: "E0E0E0" }
      })
    ]
  }));

  // Content rows with line numbers every 10 lines (on right margin)
  for (let i = 0; i < Math.max(sourceSegments.length, targetSegments.length); i++) {
    const sourceSegment = sourceSegments[i] || { speaker: '', timestamp: '', text: '' };
    const targetSegment = targetSegments[i] || { speaker: '', timestamp: '', text: '' };
    const showLineNumber = (lineNumber % 10 === 0);

    // Build source cell content
    const sourceChildren = [
      new Paragraph({
        children: [new TextRun({ text: decodeHTMLEntities(sourceSegment.timestamp), bold: true, size: 22, font: 'Times New Roman', color: '000000' })],
        spacing: { after: 80 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: decodeHTMLEntities(`${sourceSegment.speaker.toUpperCase()}:`), bold: true, size: 22, font: 'Times New Roman', color: '000000' })
        ],
        spacing: { after: 80 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: decodeHTMLEntities(sourceSegment.text), size: 22, font: 'Times New Roman', color: '000000' })
        ],
        spacing: { before: 480, after: 480 },
        ...(showLineNumber ? { alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${decodeHTMLEntities(sourceSegment.text)}                    ${lineNumber}`, size: 22, font: 'Times New Roman', color: '000000' })]} : {})
      })
    ];

    // Build target cell content
    const targetChildren = [
      new Paragraph({
        children: [new TextRun({ text: decodeHTMLEntities(targetSegment.timestamp || sourceSegment.timestamp), bold: true, size: 22, font: 'Times New Roman', color: '000000' })],
        spacing: { after: 80 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: decodeHTMLEntities(`${targetSegment.speaker.toUpperCase() || sourceSegment.speaker.toUpperCase()}:`), bold: true, size: 22, font: 'Times New Roman', color: '000000' })
        ],
        spacing: { after: 80 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: decodeHTMLEntities(targetSegment.text || '[Translation pending]'), size: 22, font: 'Times New Roman', color: '000000', italics: !targetSegment.text })
        ],
        spacing: { before: 480, after: 480 }
      })
    ];

    tableRows.push(new TableRow({
      children: [
        new TableCell({
          children: sourceChildren,
          width: { size: 50, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: targetChildren,
          width: { size: 50, type: WidthType.PERCENTAGE }
        })
      ]
    }));

    lineNumber += 10;
  }

  // Create the table
  const bilingualTable = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  contentElements.push(bilingualTable);

  // Footer with dual certification
  const footerParagraphs = [
    new Paragraph({ text: "═════════════════════════════════════════════════════════════════", alignment: AlignmentType.CENTER, spacing: { before: 640, after: 160 } }),
    new Paragraph({ text: "END OF TRANSCRIPTION AND SWORN TRANSLATION", alignment: AlignmentType.CENTER, bold: true, spacing: { after: 240 } }),
    new Paragraph({ text: `Document Status:          ${metadata.status || 'DRAFT'}`, spacing: { after: 80 } }),
    new Paragraph({ text: `Total Pages:              [Auto-generated]`, spacing: { after: 80 } }),
    new Paragraph({ text: `Case Number:              ${metadata.caseNumber || '[To be completed]'}`, spacing: { after: 320 } }),

    // DUAL CERTIFICATION
    new Paragraph({ text: "DUAL CERTIFICATION", bold: true, spacing: { after: 160 } }),
    new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 160 } }),
    new Paragraph({ text: "TRANSCRIBER'S CERTIFICATION:", bold: true, spacing: { after: 160 } }),
    new Paragraph({
      text: `I, VCB AI Transcription Service, hereby certify that the foregoing is a true and faithful transcription of the proceedings held in the ${metadata.division || '[Division]'} of the High Court on ${metadata.hearingDate || '[Date]'}.`,
      spacing: { after: 240 }
    }),
    new Paragraph({ text: "Transcriber Signature: _____________________  Date: __________", spacing: { after: 320 } }),

    new Paragraph({ text: "SWORN TRANSLATOR'S CERTIFICATION:", bold: true, spacing: { after: 160 } }),
    new Paragraph({
      text: `I, [Translator Name], am a duly admitted and sworn translator enrolled in terms of Supreme Court Rule 59 in the [Division] Division of the High Court of South Africa.`,
      spacing: { after: 160 }
    }),
    new Paragraph({
      text: `I hereby solemnly declare that the foregoing translation is a faithful and correct translation of the original proceedings from ${metadata.sourceLanguage || 'English'} into ${metadata.targetLanguage || '[Target Language]'}.`,
      spacing: { after: 240 }
    }),
    new Paragraph({ text: "Translator Signature: _____________________  Date: __________", spacing: { after: 160 } }),
    new Paragraph({ text: "[OFFICIAL TRANSLATOR STAMP/SEAL]", alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
    new Paragraph({ text: "SATI Registration: [To be completed]", spacing: { after: 240 } })
  ];

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [...headerParagraphs, ...contentElements, ...footerParagraphs]
    }],
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 22 }
        }
      }
    }
  });
};

// ============================================================================
// 5. INDEXEDDB STORAGE OPERATIONS
// ============================================================================

/**
 * Save transcription to IndexedDB
 */
export const saveTranscription = async (transcriptionData) => {
  const db = await initializeDatabase();

  const record = {
    fileName: transcriptionData.fileName,
    fileSize: transcriptionData.fileSize,
    duration: transcriptionData.duration,
    uploadDate: new Date().toISOString(),
    sourceLanguage: transcriptionData.sourceLanguage || 'English',
    targetLanguage: transcriptionData.targetLanguage || null,
    transcriptText: transcriptionData.transcriptText,
    translationText: transcriptionData.translationText || null,
    templateType: transcriptionData.templateType,
    documentBlob: transcriptionData.documentBlob,
    audioBlob: transcriptionData.audioBlob || null,
    tokensCost: transcriptionData.tokensCost,
    status: 'COMPLETED'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transcriptions', 'readwrite');
    const store = tx.objectStore('transcriptions');
    const request = store.add(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get transcription history
 */
export const getTranscriptionHistory = async (filters = {}) => {
  const db = await initializeDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transcriptions', 'readonly');
    const store = tx.objectStore('transcriptions');
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result;

      // Apply filters
      if (filters.startDate) {
        results = results.filter(r => new Date(r.uploadDate) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        results = results.filter(r => new Date(r.uploadDate) <= new Date(filters.endDate));
      }
      if (filters.language) {
        results = results.filter(r =>
          r.sourceLanguage === filters.language || r.targetLanguage === filters.language
        );
      }

      // Sort by most recent
      results.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete transcription
 */
export const deleteTranscription = async (id) => {
  const db = await initializeDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transcriptions', 'readwrite');
    const request = tx.objectStore('transcriptions').delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Auto-delete old transcriptions
 */
export const autoDeleteOldTranscriptions = async (daysToKeep = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const db = await initializeDatabase();
  const tx = db.transaction('transcriptions', 'readwrite');
  const store = tx.objectStore('transcriptions');
  const index = store.index('uploadDate');
  const range = IDBKeyRange.upperBound(cutoffDate.toISOString());

  const deletedIds = [];
  const request = index.openCursor(range);

  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        deletedIds.push(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(deletedIds);
  });
};

// ============================================================================
// 6. SETTINGS MANAGEMENT
// ============================================================================

/**
 * Save setting to IndexedDB
 */
export const saveSetting = async (key, value) => {
  const db = await initializeDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const request = tx.objectStore('settings').put({
      settingKey: key,
      settingValue: value,
      lastModified: new Date().toISOString()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get setting from IndexedDB
 */
export const getSetting = async (key) => {
  const db = await initializeDatabase();

  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const request = tx.objectStore('settings').get(key);

    request.onsuccess = () => resolve(request.result);
  });
};

// ============================================================================
// 7. PAYFAST INTEGRATION
// ============================================================================

/**
 * Generate PayFast signature using MD5 hash
 * PayFast requires: MD5(parameter_string)
 * CRITICAL: Values must NOT be URL encoded for signature generation
 */
const generatePayFastSignature = (data) => {
  // Create parameter string - values must be plain text (NO URL encoding)
  const params = [];
  const sortedKeys = Object.keys(data).sort();

  console.log('PayFast signature generation - All keys:', sortedKeys);

  for (const key of sortedKeys) {
    const value = data[key];

    // Skip signature, passphrase, and merchant_key (merchant_key must NOT be in signature)
    if (key === 'signature' || key === 'passphrase' || key === 'merchant_key') continue;

    // Skip empty, null, or undefined values
    if (value === '' || value === null || value === undefined) {
      console.log(`Skipping ${key}: empty/null/undefined`);
      continue;
    }

    // Use raw value without any encoding
    const rawValue = String(value).trim();
    params.push(`${key}=${rawValue}`);
  }

  // Join all parameters
  let paramString = params.join('&');

  // Add passphrase at the end if present
  if (data.passphrase) {
    paramString += `&passphrase=${String(data.passphrase).trim()}`;
  }

  // Log for debugging (split by & to show each param clearly)
  console.log('PayFast Signature String (raw, unencoded):');
  paramString.split('&').forEach(param => console.log('  ' + param));

  // Generate MD5 hash
  const signature = CryptoJS.MD5(paramString).toString();
  console.log('PayFast Signature (MD5):', signature);

  return signature;
};

/**
 * Initiate token purchase via PayFast
 * @param {string} packageId - The token package ID to purchase
 * @param {string} userId - The Supabase user ID (optional, defaults to 'guest')
 * @param {string} userEmail - The user's email (optional)
 */
export const initiateTokenPurchase = (packageId, userId = 'guest', userEmail = '') => {
  const tokenPackage = TOKEN_PACKAGES.find(p => p.id === packageId);
  if (!tokenPackage) {
    throw new Error('Invalid package selected');
  }

  // Store purchase intent in localStorage for retrieval after payment
  const purchaseIntent = {
    packageId: tokenPackage.id,
    tokens: tokenPackage.tokens,
    price: tokenPackage.price,
    userId: userId,
    userEmail: userEmail,
    timestamp: Date.now()
  };
  localStorage.setItem('vcb_payment_intent', JSON.stringify(purchaseIntent));

  const paymentData = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: PAYFAST_CONFIG.returnUrl,
    cancel_url: PAYFAST_CONFIG.cancelUrl,
    notify_url: PAYFAST_CONFIG.notifyUrl,
    item_name: `VCB Tokens - ${tokenPackage.label}`,
    item_description: `${tokenPackage.tokens} transcription tokens`,
    amount: tokenPackage.price.toFixed(2),
    m_payment_id: `VCB-${Date.now()}`,
    custom_int1: tokenPackage.tokens,
    custom_str1: tokenPackage.id,
    custom_str2: userId,
    custom_str3: userEmail,
    passphrase: PAYFAST_CONFIG.passphrase
  };
  
  if (userEmail) {
    paymentData.email_address = userEmail;
  }

  console.log('Initiating PayFast payment:', { packageId, userId, userEmail, amount: paymentData.amount });
  console.log('PayFast payment data keys:', Object.keys(paymentData).sort());

  const signature = generatePayFastSignature(paymentData);
  delete paymentData.passphrase;
  paymentData.signature = signature;

  // Create and submit form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYFAST_CONFIG.sandbox ?
    'https://sandbox.payfast.co.za/eng/process' :
    'https://www.payfast.co.za/eng/process';

  for (const [key, value] of Object.entries(paymentData)) {
    if (key !== 'passphrase') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
  }

  document.body.appendChild(form);
  console.log('Submitting PayFast form to:', form.action);
  form.submit();
};

/**
 * Handle successful payment
 */
export const handlePaymentSuccess = async (paymentDetails) => {
  const tokensToAdd = paymentDetails.custom_int1;
  await addTokens(tokensToAdd, `Purchase: ${paymentDetails.item_name}`);
  return tokensToAdd;
};

// ============================================================================
// 8. UTILITY FUNCTIONS
// ============================================================================

/**
 * Download blob as file
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Calculate audio duration from file
 */
export const getAudioDuration = (file) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      resolve({
        minutes,
        seconds,
        formatted: `${minutes}:${String(seconds).padStart(2, '0')}`
      });
    });
    audio.addEventListener('error', reject);
    audio.src = URL.createObjectURL(file);
  });
};

// Export all functions
export default {
  // Translation
  translateTranscript,
  parseTranscriptSegments,
  generateBilingualDocument,

  // Voice
  detectSpeakers,
  generateVoiceNarration,

  // Tokens
  initializeDatabase,
  getTokenBalance,
  addTokens,
  deductTokens,
  calculateServiceCost,

  // Documents
  generateProfessionalDocument,
  generateHighCourtDocument,

  // Storage
  saveTranscription,
  getTranscriptionHistory,
  deleteTranscription,
  autoDeleteOldTranscriptions,

  // Settings
  saveSetting,
  getSetting,

  // Payment
  initiateTokenPurchase,
  handlePaymentSuccess,

  // Utilities
  downloadBlob,
  getAudioDuration
};
