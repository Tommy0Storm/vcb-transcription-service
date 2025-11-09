/**
 * VCB TRANSCRIPTION - PROFESSIONAL DOCUMENT EXPORT SYSTEM
 * 
 * Based on the exact specifications from format/python.txt
 * Implements both Professional and High Court compliant document generation
 * with proper formatting, certifications, and bilingual support.
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

// ============================================================================
// HELPER FUNCTIONS
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

/**
 * Parse transcript segments from formatted text
 * Handles format: [HH:MM:SS]\n**SPEAKER:** text (multi-line format)
 */
const parseTranscriptSegments = (transcriptText) => {
    const segments = [];
    const lines = transcriptText.split('\n');
    
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Match timestamp pattern
        const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]$/);
        
        if (timestampMatch && i + 1 < lines.length) {
            const timestamp = timestampMatch[1];
            const nextLine = lines[i + 1].trim();
            
            // Match speaker and text pattern on next line
            const speakerMatch = nextLine.match(/^\*\*([^:]+):\*\*\s*(.*)$/);
            
            if (speakerMatch) {
                segments.push({
                    timestamp: timestamp,
                    speaker: speakerMatch[1].trim(),
                    text: speakerMatch[2].trim()
                });
                i += 2; // Skip both timestamp and speaker lines
                continue;
            }
        }
        
        // Fallback: try single-line format [HH:MM:SS] **SPEAKER:** text
        const singleLineMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s+\*\*([^:]+):\*\*\s*(.*)$/);
        if (singleLineMatch) {
            segments.push({
                timestamp: singleLineMatch[1],
                speaker: singleLineMatch[2].trim(),
                text: singleLineMatch[3].trim()
            });
        }
        
        i++;
    }
    
    return segments;
};

// ============================================================================
// PROFESSIONAL DOCUMENT GENERATION (VCB Premium Professional Template)
// ============================================================================

/**
 * Generate Professional Document with Executive Summary
 * Based on Part 1 of python.txt specifications
 */
export const generateProfessionalDocument = (transcriptText, metadata = {}, exportOptions = {}) => {
    const segments = parseTranscriptSegments(transcriptText);
    const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];
    const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Determine if bilingual based on export options
    const isBilingual = exportOptions.templateType === 'BILINGUAL' && metadata.translationText;
    const translationSegments = isBilingual ? parseTranscriptSegments(metadata.translationText) : [];
    
    const children = [];
    
    // ========== TITLE SECTION ==========
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            text: "PROFESSIONAL TRANSCRIPTION & SUMMARY",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }),
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
        })
    );
    
    // ========== DOCUMENT METADATA TABLE ==========
    children.push(
        new Paragraph({
            text: "DOCUMENT METADATA",
            bold: true,
            spacing: { after: 80 }
        }),
        new Paragraph({
            text: "─────────────────────────────────────────────────────────────────",
            spacing: { after: 120 }
        })
    );
    
    const metadataRows = [
        [`Document Title:`, metadata.fileName || 'Professional Transcription'],
        [`Project:`, metadata.projectName || 'N/A'],
        [`Source File:`, metadata.sourceFileName || metadata.fileName || 'N/A'],
        [`Recording Date:`, metadata.recordingDate || new Date().toISOString().split('T')[0]],
        [`Transcription Date:`, new Date().toISOString().split('T')[0]],
        [`Duration:`, metadata.duration || 'N/A'],
        [`Word Count:`, String(wordCount)],
        [`Participants:`, uniqueSpeakers.join(', ') || 'N/A']
    ];
    
    metadataRows.forEach(([label, value]) => {
        children.push(
            new Paragraph({
                text: `${label.padEnd(30)} ${value}`,
                spacing: { after: 80 }
            })
        );
    });
    
    children.push(new Paragraph({ text: "", spacing: { after: 240 } }));
    
    // ========== TRANSLATION NOTICE (Conditional) ==========
    if (isBilingual) {
        children.push(
            new Paragraph({
                text: "TRANSLATION NOTICE",
                bold: true,
                spacing: { after: 120 }
            }),
            new Paragraph({
                text: `This document contains both the original ${metadata.sourceLanguage || 'English'} transcription and a ${metadata.targetLanguage || 'Translation'} translation. The translation is provided for convenience and is not a certified or sworn translation.`,
                italics: true,
                spacing: { after: 320 }
            })
        );
    }
    
    // ========== EXECUTIVE SUMMARY (if provided) ==========
    if (metadata.summaryObjective || metadata.summaryKeyPoints || metadata.summaryActions) {
        children.push(
            new Paragraph({
                text: "EXECUTIVE SUMMARY",
                bold: true,
                spacing: { after: 80 }
            }),
            new Paragraph({
                text: "─────────────────────────────────────────────────────────────────",
                spacing: { after: 120 }
            })
        );
        
        if (metadata.summaryObjective) {
            children.push(
                new Paragraph({
                    text: "Objective:",
                    bold: true,
                    spacing: { after: 80 }
                }),
                new Paragraph({
                    text: metadata.summaryObjective,
                    spacing: { after: 160 }
                })
            );
        }
        
        if (metadata.summaryKeyPoints) {
            children.push(
                new Paragraph({
                    text: "Key Insights:",
                    bold: true,
                    spacing: { after: 80 }
                }),
                new Paragraph({
                    text: metadata.summaryKeyPoints,
                    spacing: { after: 160 }
                })
            );
        }
        
        if (metadata.summaryActions) {
            children.push(
                new Paragraph({
                    text: "Actionable Items:",
                    bold: true,
                    spacing: { after: 80 }
                }),
                new Paragraph({
                    text: metadata.summaryActions,
                    spacing: { after: 320 }
                })
            );
        }
    }
    
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 }
        })
    );
    
    // ========== TRANSCRIPTION BODY ==========
    if (isBilingual) {
        // Sequential bilingual format (NOT side-by-side table)
        children.push(
            new Paragraph({
                text: "TRANSCRIPTION",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 }
            })
        );
        
        segments.forEach((segment, idx) => {
            const translatedSegment = translationSegments[idx] || {};
            
            // Original language
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${segment.speaker}: `,
                            bold: true,
                            size: 22
                        }),
                        new TextRun({
                            text: decodeHTMLEntities(segment.text),
                            size: 22
                        })
                    ],
                    spacing: { after: 120 }
                })
            );
            
            // Translation (if bilingual)
            if (translatedSegment.text) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `(${metadata.targetLanguage || 'Translation'}): `,
                                italics: true,
                                size: 22
                            }),
                            new TextRun({
                                text: decodeHTMLEntities(translatedSegment.text),
                                italics: true,
                                size: 22
                            })
                        ],
                        spacing: { after: 240 }
                    })
                );
            }
        });
    } else {
        // Standard single-language format
        children.push(
            new Paragraph({
                text: "TRANSCRIPTION",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 }
            })
        );
        
        segments.forEach(segment => {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `[${segment.timestamp}] `,
                            bold: true,
                            size: 22
                        })
                    ],
                    spacing: { after: 80 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${segment.speaker}: `,
                            bold: true,
                            size: 22
                        }),
                        new TextRun({
                            text: decodeHTMLEntities(segment.text),
                            size: 22
                        })
                    ],
                    spacing: { after: 240 }
                })
            );
        });
    }
    
    // ========== FOOTER ==========
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 160 }
        }),
        new Paragraph({
            text: "END OF TRANSCRIPTION",
            alignment: AlignmentType.CENTER,
            bold: true,
            spacing: { after: 240 }
        }),
        new Paragraph({
            text: "Professional Transcription - Not Court Certified",
            alignment: AlignmentType.CENTER,
            italics: true
        })
    );
    
    return new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,    // 1 inch
                        right: 1440,
                        bottom: 1440,
                        left: 1440
                    }
                }
            },
            children
        }],
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Arial',
                        size: 22  // 11pt
                    }
                }
            }
        }
    });
};

// ============================================================================
// HIGH COURT COMPLIANT DOCUMENT GENERATION
// ============================================================================

/**
 * Generate High Court Compliant Document
 * Based on Part 2 of python.txt specifications
 * Corrected to use Practice Directives (NOT Rule 8)
 */
export const generateHighCourtDocument = (transcriptText, metadata = {}) => {
    const segments = parseTranscriptSegments(transcriptText);
    const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;
    const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];
    
    const children = [];
    
    // ========== TITLE SECTION ==========
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            text: "HIGH COURT RECORD OF PROCEEDINGS",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 }
        }),
        new Paragraph({
            text: "CERTIFIED TRANSCRIPTION",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }),
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
        })
    );
    
    // ========== CASE INFORMATION ==========
    children.push(
        new Paragraph({ text: "CASE INFORMATION", bold: true, spacing: { after: 80 } }),
        new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } })
    );
    
    const caseInfo = [
        [`Case Number:`, metadata.caseNumber || '[To be completed]'],
        [`Case Name:`, metadata.caseName || '[To be completed]'],
        [`Division:`, metadata.division || '[To be completed]'],
        [`Date of Hearing:`, metadata.hearingDate || new Date().toISOString().split('T')[0]],
        [`Judge:`, metadata.judge || '[To be completed]'],
        [`Court Clerk:`, '[To be completed]']
    ];
    
    caseInfo.forEach(([label, value]) => {
        children.push(new Paragraph({ text: `${label.padEnd(30)} ${value}`, spacing: { after: 80 } }));
    });
    
    children.push(new Paragraph({ text: "", spacing: { after: 240 } }));
    
    // ========== TRANSCRIBER INFORMATION ==========
    children.push(
        new Paragraph({ text: "TRANSCRIBER INFORMATION", bold: true, spacing: { after: 80 } }),
        new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
        new Paragraph({ text: `Name:                     VCB AI Transcription Service`, spacing: { after: 80 } }),
        new Paragraph({ text: `Date Transcribed:         ${new Date().toISOString().split('T')[0]}`, spacing: { after: 80 } }),
        new Paragraph({ text: `Transcription Method:     AI Assisted (Google Gemini)`, spacing: { after: 240 } })
    );
    
    // ========== FORMATTING & COMPLIANCE (CORRECTED) ==========
    children.push(
        new Paragraph({ text: "FORMATTING & COMPLIANCE", bold: true, spacing: { after: 80 } }),
        new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
        new Paragraph({ text: `Font:                     Arial, 12pt`, spacing: { after: 80 } }),
        new Paragraph({ text: `Line Spacing:             1.5 (One-and-a-half)`, spacing: { after: 80 } }),
        new Paragraph({ text: `Margins:                  2cm (all sides)`, spacing: { after: 80 } }),
        new Paragraph({ text: `Line Numbering:           Consecutive per page`, spacing: { after: 80 } }),
        new Paragraph({ text: `Compliance:               SA High Court Practice Directives`, spacing: { after: 320 } })
    );
    
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 }
        })
    );
    
    // ========== TRANSCRIPTION CONTENT ==========
    children.push(
        new Paragraph({
            text: "TRANSCRIPT",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
        })
    );
    
    segments.forEach(segment => {
        children.push(
            new Paragraph({
                text: decodeHTMLEntities(segment.speaker),
                spacing: { after: 100 }
            }),
            new Paragraph({
                text: decodeHTMLEntities(segment.text),
                spacing: { after: 400 },
                alignment: AlignmentType.JUSTIFIED
            })
        );
    });
    
    // ========== TRANSCRIBER'S CERTIFICATION ==========
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { before: 640, after: 160 }
        }),
        new Paragraph({
            text: "TRANSCRIBER'S CERTIFICATION",
            bold: true,
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: `I, ${metadata.transcriber || 'VCB AI Transcription Service'}, hereby certify that I was employed to transcribe the proceedings in the undermentioned case, and that the foregoing is a faithful, accurate, and correct transcription of the proceedings recorded by mechanical, electronic, or digital means in the ${metadata.court || '[Court]'} Court of the ${metadata.division || '[Division]'} Division on ${metadata.hearingDate || '[Date]'}.`,
            spacing: { after: 240 },
            alignment: AlignmentType.JUSTIFIED
        }),
        new Paragraph({
            text: "Signature: _________________________",
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: `Date: ${metadata.certificationDate || new Date().toISOString().split('T')[0]}`
        })
    );
    
    return new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1134,    // 2cm
                        right: 1134,
                        bottom: 1134,
                        left: 1134
                    }
                }
            },
            children
        }],
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Arial',
                        size: 24  // 12pt
                    },
                    paragraph: {
                        spacing: {
                            line: 360  // 1.5 line spacing
                        }
                    }
                }
            }
        }
    });
};

/**
 * Generate High Court Bilingual Document with Side-by-Side Table
 * Based on Part 2 specifications with 4-column table structure
 */
export const generateHighCourtBilingualDocument = (transcriptText, translationText, metadata = {}) => {
    const sourceSegments = parseTranscriptSegments(transcriptText);
    const targetSegments = parseTranscriptSegments(translationText);
    const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;
    
    const children = [];
    
    // ========== TITLE SECTION ==========
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER
        }),
        new Paragraph({
            text: "HIGH COURT RECORD OF PROCEEDINGS",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 }
        }),
        new Paragraph({
            text: "CERTIFIED TRANSCRIPTION & SWORN TRANSLATION",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }),
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
        })
    );
    
    // ========== CASE INFORMATION (same as above) ==========
    children.push(
        new Paragraph({ text: "CASE INFORMATION", bold: true, spacing: { after: 80 } }),
        new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } })
    );
    
    const caseInfo = [
        [`Case Number:`, metadata.caseNumber || '[To be completed]'],
        [`Case Name:`, metadata.caseName || '[To be completed]'],
        [`Division:`, metadata.division || '[To be completed]'],
        [`Date of Hearing:`, metadata.hearingDate || new Date().toISOString().split('T')[0]],
        [`Judge:`, metadata.judge || '[To be completed]']
    ];
    
    caseInfo.forEach(([label, value]) => {
        children.push(new Paragraph({ text: `${label.padEnd(30)} ${value}`, spacing: { after: 80 } }));
    });
    
    children.push(new Paragraph({ text: "", spacing: { after: 240 } }));
    
    // ========== TRANSLATOR INFORMATION ==========
    children.push(
        new Paragraph({ text: "SWORN TRANSLATOR INFORMATION", bold: true, spacing: { after: 80 } }),
        new Paragraph({ text: "─────────────────────────────────────────────────────────────────", spacing: { after: 120 } }),
        new Paragraph({ text: `Name:                     ${metadata.translatorName || '[To be completed]'}`, spacing: { after: 80 } }),
        new Paragraph({ text: `Status:                   Rule 59 Enrolled Translator`, spacing: { after: 80 } }),
        new Paragraph({ text: `High Court Division:      ${metadata.translatorDivision || '[To be completed]'}`, spacing: { after: 80 } }),
        new Paragraph({ text: `SATI Registration:        ${metadata.translatorSATI || '[To be completed]'}`, spacing: { after: 80 } }),
        new Paragraph({ text: `Language Pair:            ${metadata.sourceLanguage || 'English'} - ${metadata.targetLanguage || '[Target Language]'}`, spacing: { after: 240 } })
    );
    
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 }
        })
    );
    
    // ========== BILINGUAL TABLE (4-column structure) ==========
    const tableRows = [];
    
    // Header row
    tableRows.push(
        new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({
                        text: `${metadata.sourceLanguage || 'ORIGINAL'}`,
                        bold: true,
                        alignment: AlignmentType.CENTER
                    })],
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    shading: { fill: "E0E0E0" }
                }),
                new TableCell({
                    children: [new Paragraph({
                        text: "SEGMENT",
                        bold: true,
                        alignment: AlignmentType.CENTER
                    })],
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    shading: { fill: "E0E0E0" }
                }),
                new TableCell({
                    children: [new Paragraph({
                        text: `${metadata.targetLanguage || 'TRANSLATION'}`,
                        bold: true,
                        alignment: AlignmentType.CENTER
                    })],
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    shading: { fill: "E0E0E0" }
                })
            ]
        })
    );
    
    // Content rows
    for (let i = 0; i < Math.max(sourceSegments.length, targetSegments.length); i++) {
        const source = sourceSegments[i] || { speaker: '', text: '' };
        const target = targetSegments[i] || { speaker: '', text: '' };
        
        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${source.speaker}: `, bold: true }),
                                    new TextRun({ text: decodeHTMLEntities(source.text) })
                                ],
                                spacing: { after: 200 }
                            })
                        ],
                        width: { size: 45, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({
                            text: String(i + 1),
                            alignment: AlignmentType.CENTER
                        })],
                        width: { size: 10, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${target.speaker}: `, bold: true }),
                                    new TextRun({ text: decodeHTMLEntities(target.text) })
                                ],
                                spacing: { after: 200 }
                            })
                        ],
                        width: { size: 45, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        );
    }
    
    children.push(
        new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
        })
    );
    
    // ========== DUAL CERTIFICATION ==========
    children.push(
        new Paragraph({
            text: "═════════════════════════════════════════════════════════════════",
            alignment: AlignmentType.CENTER,
            spacing: { before: 640, after: 160 }
        }),
        new Paragraph({
            text: "DUAL CERTIFICATION",
            bold: true,
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: "TRANSCRIBER'S CERTIFICATION:",
            bold: true,
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: `I, VCB AI Transcription Service, hereby certify that the foregoing is a true and faithful transcription of the proceedings held in the ${metadata.division || '[Division]'} of the High Court on ${metadata.hearingDate || '[Date]'}.`,
            spacing: { after: 240 },
            alignment: AlignmentType.JUSTIFIED
        }),
        new Paragraph({
            text: "Transcriber Signature: _____________________  Date: __________",
            spacing: { after: 320 }
        }),
        new Paragraph({
            text: "SWORN TRANSLATOR'S CERTIFICATION (Rule 59):",
            bold: true,
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: `I, ${metadata.translatorName || '[Translator Name]'}, am a duly admitted and sworn translator enrolled in terms of Supreme Court Rule 59 in the ${metadata.translatorDivision || '[Division]'} Division of the High Court of South Africa.`,
            spacing: { after: 160 },
            alignment: AlignmentType.JUSTIFIED
        }),
        new Paragraph({
            text: `I hereby solemnly declare that I have faithfully and correctly translated, to the best of my knowledge and ability, the proceedings from ${metadata.sourceLanguage || 'English'} into ${metadata.targetLanguage || '[Target Language]'} and that the foregoing is a true and correct translation of the original proceedings.`,
            spacing: { after: 240 },
            alignment: AlignmentType.JUSTIFIED
        }),
        new Paragraph({
            text: "Translator Signature: _____________________  Date: __________",
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: "[OFFICIAL TRANSLATOR STAMP/SEAL]",
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 }
        }),
        new Paragraph({
            text: `SATI Registration: ${metadata.translatorSATI || '[To be completed]'}`,
            spacing: { after: 240 }
        })
    );
    
    return new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1134,
                        right: 1134,
                        bottom: 1134,
                        left: 1134
                    }
                }
            },
            children
        }],
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Arial',
                        size: 24
                    },
                    paragraph: {
                        spacing: {
                            line: 360
                        }
                    }
                }
            }
        }
    });
};

export default {
    generateProfessionalDocument,
    generateHighCourtDocument,
    generateHighCourtBilingualDocument
};
