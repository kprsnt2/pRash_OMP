import { ModelProvider } from '@/types';

export interface ProviderCallParams {
  provider: ModelProvider;
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderCallResult {
  stream: ReadableStream<Uint8Array>;
  provider: ModelProvider;
  model: string;
  fallbackReason?: string;
}

// Convert payload for providers that don't support images in standard chat
function sanitizeMessagesForTextOnly(
  messages: ProviderCallParams['messages']
): Array<{ role: string; content: string }> {
  return messages.map((m) => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    // Extract text and note attached images
    const textParts = m.content
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('\n');
    const imageCount = m.content.filter((part) => part.type === 'image_url').length;
    const notice = imageCount > 0 ? `\n[${imageCount} image attachment(s) referenced in conversation]` : '';
    return {
      role: m.role,
      content: (textParts + notice).trim() || '[Empty or media-only message]',
    };
  });
}

export async function callProviderApi(
  params: ProviderCallParams
): Promise<Response> {
  const { provider, model, messages, apiKey } = params;

  if (provider === 'openai') {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
  }

  if (provider === 'gemini') {
    // Google Gemini OpenAI-compatible endpoint
    return fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.startsWith('gemini') ? model : 'gemini-2.5-flash',
        messages,
        stream: true,
      }),
    });
  }

  if (provider === 'nvidia') {
    const textMessages = sanitizeMessagesForTextOnly(messages);
    return fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: textMessages,
        stream: true,
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });
  }

  if (provider === 'groq') {
    const textMessages = sanitizeMessagesForTextOnly(messages);
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: textMessages,
        stream: true,
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
