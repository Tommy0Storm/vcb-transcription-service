# Google Job Mapping - VCB Transcription Service

## Overview

Every transcription processed by VCB is mapped to a Google Gemini API job for full traceability and audit compliance.

## Serial Number Format

```
VCB-YYYYMMDD-{GOOGLE_JOB_ID}
```

**Example**: `VCB-20250115-A3F8B2C1`

- `VCB`: Service identifier
- `YYYYMMDD`: Date of transcription
- `GOOGLE_JOB_ID`: First 8 characters of Google Gemini operation ID

## Metadata Stored

Each transcription stores complete Google API metadata:

```javascript
{
  serialNumber: "VCB-20250115-A3F8B2C1",
  geminiMetadata: {
    jobName: "projects/{project}/locations/{location}/operations/{operation_id}",
    model: "gemini-2.5-pro",
    requestId: "REQ-1736956800000",
    timestamp: "2025-01-15T10:30:00.000Z"
  }
}
```

## Mapping Process

### 1. Transcription Request
- User uploads audio file
- System sends request to Google Gemini API
- Google returns response with job metadata

### 2. Serial Number Generation
```javascript
const geminiJobName = response.name; // Full job path from Google
const serialNumber = await generateSerialNumber(geminiJobName);
// Extracts operation ID from: "projects/.../operations/abc123def456"
// Creates: "VCB-20250115-ABC123DE"
```

### 3. Metadata Storage
- Serial number stored in transcription result
- Full Google job name stored for reference
- Model and timestamp recorded
- Logged to console for audit trail

### 4. Document Certification
Legal documents include:
- Document Serial Number
- Google Job ID (full path)
- Processing Model used
- Timestamp of processing

## Audit Trail

Console logs provide mapping verification:

```
=== GOOGLE JOB MAPPING ===
Serial Number: VCB-20250115-A3F8B2C1
Gemini Job Name: projects/my-project/locations/us-central1/operations/abc123def456
Model: gemini-2.5-pro
File: meeting-recording.mp3
Timestamp: 2025-01-15T10:30:00.000Z
========================
```

## Supabase Integration

When user is authenticated, mapping is stored in Supabase:

```sql
-- transcription_logs table includes:
- serial_number (VCB-YYYYMMDD-JOBID)
- gemini_job_id (full Google job path)
- file_name
- processing_tier
- timestamp
```

## Verification

To verify a serial number maps to a Google job:

1. Extract job ID from serial: `VCB-20250115-A3F8B2C1` → `A3F8B2C1`
2. Check console logs for full job path
3. Query Supabase for complete metadata
4. Cross-reference with Google Cloud Console (if access available)

## Benefits

✅ **Full Traceability**: Every document traces back to exact Google API job
✅ **Audit Compliance**: Complete chain of custody for legal documents
✅ **Debugging**: Easy to identify which API call produced which result
✅ **Cost Tracking**: Map costs to specific transcription jobs
✅ **Quality Assurance**: Track model performance per job

## Fallback Behavior

If Google job ID is unavailable:
- Serial format: `VCB-YYYYMMDD-LOCAL`
- Still includes timestamp and model info
- Logged as local processing

## Example Document Output

```
CERTIFICATE OF TRANSCRIPTION

Document Serial Number: VCB-20250115-A3F8B2C1
Google Job ID: projects/vcb-ai/locations/us-central1/operations/abc123def456
Processing Model: gemini-2.5-pro

I certify that this transcription was processed by VCB AI Transcription Service
using Google Gemini API on 2025-01-15 at 10:30:00 UTC.

Signature: ___________________________
VCB AI Transcription Service
```

---

**Last Updated**: 2025-01-15
**Version**: 1.0
