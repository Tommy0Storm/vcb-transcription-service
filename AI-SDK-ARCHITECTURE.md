# AI SDK Architecture - VCB Transcription Service

## Primary AI SDK: Vercel AI SDK

The VCB Transcription Service uses the **Vercel AI SDK** (`ai` npm package) as the main overarching SDK for all AI operations.

### Why Vercel AI SDK?

1. **Unified Interface**: Single API for multiple AI providers (OpenAI, Anthropic, Google, etc.)
2. **Provider Agnostic**: Easy to switch between providers without rewriting code
3. **Streaming Support**: Built-in support for real-time streaming responses
4. **Type Safety**: Full TypeScript support with excellent type inference
5. **Edge Ready**: Works in edge runtimes (Cloudflare Workers, Vercel Edge Functions)
6. **Error Handling**: Built-in retry logic and error handling
7. **Tool Support**: First-class support for function calling and tools

### Installation

```bash
npm install ai
```

**Current Version**: `^5.0.86` (as of 2025-11-03)

## Current AI Providers

### 1. Google Gemini (Primary)
- **Package**: `@google/genai` v1.28.0
- **Used For**:
  - Audio transcription (Gemini Flash Audio)
  - Text translation (11 SA languages + foreign)
  - Document analysis and generation
  - Q&A and assistant features

### 2. Vercel AI SDK (Future/New Features)
- **Package**: `ai` v5.0.86
- **Will Be Used For**:
  - New AI features and handlers
  - Unified streaming responses
  - Multi-provider fallback logic
  - Tool/function calling

## Migration Strategy

### Phase 1: Coexistence (Current)
- Keep existing Google Gemini implementation
- Use Vercel AI SDK for new features
- Document both approaches

### Phase 2: Gradual Migration
- Migrate high-traffic endpoints to AI SDK
- Add provider fallback (Google → OpenAI → Anthropic)
- Maintain backward compatibility

### Phase 3: Full Migration
- Replace all direct `@google/genai` calls with AI SDK
- Implement unified error handling
- Add telemetry and monitoring

## Code Examples

### Current Approach (Google Gemini Direct)

```javascript
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const result = await model.generateContent(prompt);
const text = result.response.text();
```

### New Approach (Vercel AI SDK)

```javascript
import { generateText, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Non-streaming
const { text } = await generateText({
  model: google('gemini-1.5-flash'),
  prompt: 'Transcribe this audio...',
});

// Streaming
const result = streamText({
  model: google('gemini-1.5-flash'),
  prompt: 'Translate this text...',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Multi-Provider Fallback

```javascript
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeWithFallback(prompt) {
  try {
    // Try Google first
    return await generateText({
      model: google('gemini-1.5-flash'),
      prompt,
    });
  } catch (error) {
    console.warn('Google failed, falling back to OpenAI:', error);
    // Fallback to OpenAI
    return await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
    });
  }
}
```

## File Structure

```
vcb-transcription-service/
├── vcb-features-enhanced.jsx     # Main features (current Google Gemini)
├── vcb-ai-handlers.js            # NEW: Unified AI handlers using AI SDK
├── ai-config.js                  # NEW: AI SDK configuration
└── AI-SDK-ARCHITECTURE.md        # This file
```

## Best Practices

### When to Use Vercel AI SDK

✅ **Use AI SDK for:**
- New AI features
- Streaming responses
- Multi-provider support needed
- Function/tool calling
- Chat interfaces
- Real-time AI interactions

### When to Keep Direct Provider SDKs

⚠️ **Keep Direct SDK for:**
- Provider-specific features (e.g., Gemini Flash Audio)
- Existing working code (don't break what works)
- Features not yet supported by AI SDK

## Configuration

### Environment Variables

```bash
# Google Gemini (Current)
GEMINI_API_KEY=your_google_api_key

# OpenAI (Optional - for fallback)
OPENAI_API_KEY=your_openai_key

# Anthropic (Optional - for fallback)
ANTHROPIC_API_KEY=your_anthropic_key
```

### AI SDK Config Example

```javascript
// ai-config.js
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export const providers = {
  google: createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  }),
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
};

export const models = {
  transcription: providers.google('gemini-1.5-flash'),
  translation: providers.google('gemini-1.5-pro'),
  chat: providers.google('gemini-2.0-flash-exp'),
  fallback: providers.openai('gpt-4-turbo'),
};
```

## Resources

- **Vercel AI SDK Docs**: https://sdk.vercel.ai/docs
- **Google Provider**: https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai
- **Streaming Guide**: https://sdk.vercel.ai/docs/ai-sdk-core/streaming
- **GitHub**: https://github.com/vercel/ai

## Version History

- **2025-11-03**: Initial architecture document, `ai@5.0.86` installed
- **Future**: Migration to AI SDK for all new features

---

**Note**: This is a living document. Update as the architecture evolves.
