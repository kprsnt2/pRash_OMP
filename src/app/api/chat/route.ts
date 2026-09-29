import { NextRequest, NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents';
import {
  callProviderApi,
  generateSmartFallbackResponse,
  parseProviderStream,
} from '@/lib/api-providers';
import {
  DEFAULT_FALLBACK_CHAIN,
  getModelForProvider,
  PRIVACY_FALLBACK_CHAIN,
} from '@/lib/models';
import { AgentId, ModelProvider } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      messages,
      agentId = 'general',
      modelOverride,
      privacyMode = false,
      userKeys = {},
      autoFallback = true,
    } = body;

    // Resolve active agent and system prompt
    const agent = AGENTS[agentId as AgentId] || AGENTS.general;
    const systemPrompt = agent.systemPrompt;

    const fullMessages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ];

    // Helper to resolve API key
    const getApiKey = (provider: ModelProvider): string | undefined => {
      if (provider === 'gemini') {
        return (
          userKeys.gemini ||
          req.headers.get('x-gemini-key') ||
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_AI_API_KEY ||
          undefined
        );
      }
      if (provider === 'openai') {
        return (
          userKeys.openai ||
          req.headers.get('x-openai-key') ||
          process.env.OPENAI_API_KEY ||
          undefined
        );
      }
      if (provider === 'groq') {
        return (
          userKeys.groq ||
          req.headers.get('x-groq-key') ||
          process.env.GROQ_API_KEY ||
          undefined
        );
      }
      if (provider === 'nvidia') {
        return (
          userKeys.nvidia ||
          req.headers.get('x-nvidia-key') ||
          process.env.NVIDIA_API_KEY ||
          undefined
        );
      }
      return undefined;
    };

    interface ChainStep {
      provider: ModelProvider;
      model: string;
    }

    let candidateChain: ChainStep[] = [];

    if (privacyMode) {
      const geminiModel = getModelForProvider('gemini');
      candidateChain = [
        { provider: 'gemini', model: geminiModel },
        ...PRIVACY_FALLBACK_CHAIN.filter((s) => s.model !== geminiModel),
      ];
    } else if (modelOverride && modelOverride !== 'auto') {
      let overrideProvider: ModelProvider = 'openai';
      if (modelOverride.startsWith('gemini')) overrideProvider = 'gemini';
      else if (modelOverride.startsWith('meta/') || modelOverride.startsWith('nvidia/')) overrideProvider = 'nvidia';
      else if (modelOverride.startsWith('meta-llama/') || modelOverride.startsWith('llama-')) overrideProvider = 'groq';

      candidateChain.push({ provider: overrideProvider, model: modelOverride });

      if (autoFallback) {
        for (const step of DEFAULT_FALLBACK_CHAIN) {
          const resolvedModel = getModelForProvider(step.provider);
          if (step.provider !== overrideProvider || resolvedModel !== modelOverride) {
            candidateChain.push({ provider: step.provider, model: resolvedModel });
          }
        }
      }
    } else {
      // Auto smart fallback order
      candidateChain = [
        { provider: 'gemini', model: getModelForProvider('gemini') },
        { provider: 'openai', model: getModelForProvider('openai') },
        { provider: 'groq', model: getModelForProvider('groq') },
        { provider: 'nvidia', model: getModelForProvider('nvidia') },
      ];
    }

    const fallbackLogs: string[] = [];
    let successfulResponse: Response | null = null;
    let successfulStep: ChainStep | null = null;

    for (let i = 0; i < candidateChain.length; i++) {
      const step = candidateChain[i];
      const apiKey = getApiKey(step.provider);

      if (!apiKey) {
        fallbackLogs.push(`${step.provider.toUpperCase()} (${step.model}): No API key set`);
        continue;
      }

      try {
        const response = await callProviderApi({
          provider: step.provider,
          model: step.model,
          messages: fullMessages,
          apiKey,
        });

        if (response.ok && response.body) {
          successfulResponse = response;
          successfulStep = step;
          break;
        }

        const errorText = await response.text();
        let parsedError = errorText;
        try {
          const json = JSON.parse(errorText);
          parsedError = json.error?.message || json.message || errorText;
        } catch {
          // keep text
        }

        fallbackLogs.push(
          `${step.provider.toUpperCase()} (${step.model}) HTTP ${response.status}: ${parsedError.slice(0, 120)}`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        fallbackLogs.push(`${step.provider.toUpperCase()} (${step.model}) network error: ${message.slice(0, 100)}`);
      }
    }

    const encoder = new TextEncoder();
    let fallbackExplanation: string | undefined;

    // Check if fallback happened
    if (successfulStep && fallbackLogs.length > 0) {
      fallbackExplanation = `Auto-routed to ${successfulStep.provider.toUpperCase()} (${successfulStep.model}). Prior steps failed: ${fallbackLogs.join(' ➔ ')}`;
    }

    // Determine stream generator
    let tokenGenerator: AsyncGenerator<string>;
    let finalModel = successfulStep?.model || 'smart-fallback';
    let finalProvider = successfulStep?.provider || 'gemini';

    if (successfulResponse && successfulStep && successfulResponse.body) {
      tokenGenerator = parseProviderStream(successfulStep.provider, successfulResponse.body);
    } else {
      // If privacy mode was explicitly requested with no key
      if (privacyMode) {
        return NextResponse.json(
          {
            error: 'Privacy Mode requires a valid Google Gemini API key (zero-retention policy).',
            details: fallbackLogs,
            privacyMode: true,
            hint: 'Please provide a Gemini API key in Settings (Gear Icon) or via GEMINI_API_KEY.',
          },
          { status: 400 }
        );
      }
      // Built-in intelligent fallback
      finalModel = 'Built-in Smart Fallback';
      finalProvider = 'groq';
      fallbackExplanation = `Auto-routed to Built-in Assistant: External providers unavailable (${fallbackLogs.join('; ') || 'No API keys set in Settings or .env'}).`;

      const lastUserMsg = messages[messages.length - 1]?.content;
      const userText =
        typeof lastUserMsg === 'string'
          ? lastUserMsg
          : Array.isArray(lastUserMsg)
          ? lastUserMsg.find((p: { type: string; text?: string }) => p.type === 'text')?.text || ''
          : '';

      tokenGenerator = generateSmartFallbackResponse(agent.name, userText || 'Hello');
    }

    // Create normalized SSE stream
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const token of tokenGenerator) {
            if (token) {
              const payload = JSON.stringify({ text: token });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const errorPayload = JSON.stringify({
            error: errMsg,
            text: `\n\n⚠️ *Streaming error encountered: ${errMsg}*`,
          });
          controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    const latencyMs = Date.now() - startTime;

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Model-Used': finalModel,
        'X-Provider-Used': finalProvider,
        'X-Privacy-Mode': privacyMode ? 'true' : 'false',
        'X-Latency-Ms': String(latencyMs),
        ...(fallbackExplanation
          ? { 'X-Fallback-Note': encodeURIComponent(fallbackExplanation) }
          : {}),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal Server Error in Chat Orchestrator', details: message },
      { status: 500 }
    );
  }
}
