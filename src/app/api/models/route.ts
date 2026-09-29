import { NextRequest, NextResponse } from 'next/server';
import { callProviderApi } from '@/lib/api-providers';
import {
  getAvailableModels,
  getGlobalDefaultModel,
  getModelForProvider,
} from '@/lib/models';
import { ModelProvider } from '@/types';

export const runtime = 'nodejs';

// GET: Check server-side configured keys and resolved model list
export async function GET() {
  const models = getAvailableModels();
  const defaultModel = getGlobalDefaultModel();

  return NextResponse.json({
    models,
    defaultModel,
    activeModels: {
      openai: getModelForProvider('openai'),
      gemini: getModelForProvider('gemini'),
      nvidia: getModelForProvider('nvidia'),
      groq: getModelForProvider('groq'),
    },
    serverConfigured: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
      nvidia: Boolean(process.env.NVIDIA_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
    },
  });
}

// POST: Test an API key
export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ ok: false, error: 'Provider and API key required' }, { status: 400 });
    }

    const testModel = model || getModelForProvider(provider as ModelProvider);

    const res = await callProviderApi({
      provider: provider as ModelProvider,
      model: testModel,
      apiKey,
      messages: [{ role: 'user', content: 'Respond with OK.' }],
      maxTokens: 5,
    });

    if (res.ok) {
      return NextResponse.json({ ok: true, provider, model: testModel });
    } else {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || parsed.message || errText;
      } catch {
        // use raw
      }
      return NextResponse.json({ ok: false, status: res.status, error: msg }, { status: 200 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
