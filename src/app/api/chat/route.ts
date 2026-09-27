import { NextRequest, NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents';
import { callProviderApi } from '@/lib/api-providers';
import { DEFAULT_FALLBACK_CHAIN, PRIVACY_FALLBACK_CHAIN } from '@/lib/models';
import { AgentId, ModelProvider } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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

    // Resolve system prompt for selected agent
    const agent = AGENTS[agentId as AgentId] || AGENTS.general;
    const systemPrompt = agent.systemPrompt;

    // Prepare full message array with injected system prompt
    const fullMessages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ];

    // Helper to get API key for a provider
    const getApiKey = (provider: ModelProvider): string | undefined => {
      if (provider === 'openai') {
        return (
          userKeys.openai ||
          req.headers.get('x-openai-key') ||
          process.env.OPENAI_API_KEY
        );
      }
      if (provider === 'gemini') {
        return (
          userKeys.gemini ||
          req.headers.get('x-gemini-key') ||
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_AI_API_KEY
        );
      }
      if (provider === 'nvidia') {
        return (
          userKeys.nvidia ||
          req.headers.get('x-nvidia-key') ||
          process.env.NVIDIA_API_KEY
        );
      }
      if (provider === 'groq') {
        return (
          userKeys.groq ||
          req.headers.get('x-groq-key') ||
          process.env.GROQ_API_KEY
        );
      }
      return undefined;
    };

    // Determine candidate chain
    interface ChainStep {
      provider: ModelProvider;
      model: string;
    }

    let candidateChain: ChainStep[] = [];

    if (privacyMode) {
      // STRICT PRIVACY / ZERO RETENTION: Gemini Only
      candidateChain = [...PRIVACY_FALLBACK_CHAIN];
    } else if (modelOverride) {
      // Find provider for modelOverride
      let provider: ModelProvider = 'openai';
      if (modelOverride.startsWith('gemini')) provider = 'gemini';
      else if (modelOverride.startsWith('meta/') || modelOverride.startsWith('nvidia/')) provider = 'nvidia';
      else if (modelOverride.startsWith('llama-')) provider = 'groq';

      candidateChain.push({ provider, model: modelOverride });

      if (autoFallback) {
        // Append other providers as backups
        for (const step of DEFAULT_FALLBACK_CHAIN) {
          if (step.provider !== provider || step.model !== modelOverride) {
            candidateChain.push(step);
          }
        }
      }
    } else {
      candidateChain = [...DEFAULT_FALLBACK_CHAIN];
    }

    const fallbackLogs: string[] = [];
    let successfulResponse: Response | null = null;
    let successfulStep: ChainStep | null = null;

    for (let i = 0; i < candidateChain.length; i++) {
      const step = candidateChain[i];
      const apiKey = getApiKey(step.provider);

      if (!apiKey) {
        fallbackLogs.push(`${step.provider} (${step.model}): No API key provided`);
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
        } else {
          const errorText = await response.text();
          let parsedError = errorText;
          try {
            const json = JSON.parse(errorText);
            parsedError = json.error?.message || json.message || errorText;
          } catch {
            // Keep raw text
          }
          fallbackLogs.push(
            `${step.provider} (${step.model}) HTTP ${response.status}: ${parsedError.slice(0, 150)}`
          );

          // If gpt-5.4-mini was rejected (e.g. model not found), also test gpt-4o-mini if on OpenAI
          if (step.provider === 'openai' && step.model === 'gpt-5.4-mini') {
            try {
              const fallbackOpenAi = await callProviderApi({
                provider: 'openai',
                model: 'gpt-4o-mini',
                messages: fullMessages,
                apiKey,
              });
              if (fallbackOpenAi.ok && fallbackOpenAi.body) {
                successfulResponse = fallbackOpenAi;
                successfulStep = { provider: 'openai', model: 'gpt-4o-mini' };
                fallbackLogs.push('Auto-switched from gpt-5.4-mini to gpt-4o-mini on OpenAI');
                break;
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        fallbackLogs.push(`${step.provider} (${step.model}) network error: ${message}`);
      }
    }

    if (!successfulResponse || !successfulStep || !successfulResponse.body) {
      return NextResponse.json(
        {
          error: 'All AI model providers failed or are missing API keys.',
          details: fallbackLogs,
          privacyMode,
          hint: privacyMode
            ? 'In Privacy Mode, only Gemini is used (zero training retention). Please set your Gemini API key in Settings.'
            : 'Configure your OpenAI, Gemini, NVIDIA, or Groq API keys in the Settings modal or .env.local',
        },
        { status: 502 }
      );
    }

    // Set up streaming response with fallback telemetry
    const fallbackNote =
      fallbackLogs.length > 0
        ? `Switched to ${successfulStep.provider.toUpperCase()} (${successfulStep.model}) because prior attempts failed: ${fallbackLogs.join('; ')}`
        : undefined;

    return new Response(successfulResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Model-Used': successfulStep.model,
        'X-Provider-Used': successfulStep.provider,
        'X-Privacy-Mode': privacyMode ? 'true' : 'false',
        ...(fallbackNote ? { 'X-Fallback-Note': encodeURIComponent(fallbackNote) } : {}),
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
