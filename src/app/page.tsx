'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { AgentSelector } from '@/components/AgentSelector';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Sidebar } from '@/components/Sidebar';
import { SettingsModal } from '@/components/SettingsModal';
import { AGENTS } from '@/lib/agents';
import { formatUserMessageWithAttachments } from '@/lib/attachments';
import {
  loadSettings,
  saveSettings,
  loadSessions,
  saveSession,
  deleteSession,
  clearAllSessions,
  DEFAULT_SETTINGS,
} from '@/lib/storage';
import type {
  ChatSession,
  Message,
  Attachment,
  AgentId,
  UserSettings,
  ModelProvider,
} from '@/types';
import { AlertCircle, Key, ArrowDown } from 'lucide-react';

export default function ChatPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('kidstory');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);

    const loadedSessions = loadSessions();
    setSessions(loadedSessions);

    if (loadedSessions.length > 0 && !loadedSettings.privacyMode) {
      const latest = loadedSessions[0];
      setCurrentSessionId(latest.id);
      setMessages(latest.messages);
      setActiveAgentId(latest.agentId);
    } else {
      // Start fresh session with KidStory or general
      handleStartNewSession('kidstory', loadedSettings.privacyMode);
    }
  }, []);

  const handleStartNewSession = useCallback(
    (agentId: AgentId = activeAgentId, privacy = settings.privacyMode) => {
      const newId = `session-${Date.now()}`;
      const agent = AGENTS[agentId] || AGENTS.general;
      const initialMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: agent.welcomeMessage,
        agentId,
        timestamp: Date.now(),
      };

      const newSession: ChatSession = {
        id: newId,
        title: `Chat with ${agent.name}`,
        agentId,
        messages: [initialMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isTemporary: privacy,
      };

      setCurrentSessionId(newId);
      setMessages([initialMessage]);
      setActiveAgentId(agentId);

      if (!privacy) {
        saveSession(newSession);
        setSessions(loadSessions());
      }
    },
    [activeAgentId, settings.privacyMode]
  );

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  // Handle scroll position to show/hide scroll-to-bottom button
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isFarUp = el.scrollHeight - el.scrollTop - el.clientHeight > 250;
    setShowScrollBottom(isFarUp);
  };

  const handleSelectSession = (id: string) => {
    const found = sessions.find((s) => s.id === id);
    if (found) {
      setCurrentSessionId(found.id);
      setMessages(found.messages);
      setActiveAgentId(found.agentId);
    }
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updated = loadSessions();
    setSessions(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) {
        handleSelectSession(updated[0].id);
      } else {
        handleStartNewSession();
      }
    }
  };

  const handleClearAllHistory = () => {
    clearAllSessions();
    setSessions([]);
    handleStartNewSession();
  };

  const handleSwitchAgent = (agentId: AgentId) => {
    setActiveAgentId(agentId);
    // If only welcome message exists, update it to the new agent's welcome message
    if (messages.length <= 1) {
      const agent = AGENTS[agentId] || AGENTS.general;
      const initialMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: agent.welcomeMessage,
        agentId,
        timestamp: Date.now(),
      };
      setMessages([initialMessage]);

      if (currentSessionId && !settings.privacyMode) {
        const updatedSession: ChatSession = {
          id: currentSessionId,
          title: `Chat with ${agent.name}`,
          agentId,
          messages: [initialMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveSession(updatedSession);
        setSessions(loadSessions());
      }
    }
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;
    if (isLoading) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: text,
      attachments,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Prepare assistant placeholder message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agentId: activeAgentId,
      timestamp: Date.now(),
    };

    setMessages([...newMessages, assistantPlaceholder]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build API messages payload with full attachment formatting
      const formattedHistory = newMessages.map((msg, index) => {
        if (index === newMessages.length - 1 && msg.role === 'user') {
          return {
            role: msg.role,
            content: formatUserMessageWithAttachments(msg.content, msg.attachments || []),
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.openaiApiKey ? { 'x-openai-key': settings.openaiApiKey } : {}),
          ...(settings.geminiApiKey ? { 'x-gemini-key': settings.geminiApiKey } : {}),
          ...(settings.nvidiaApiKey ? { 'x-nvidia-key': settings.nvidiaApiKey } : {}),
          ...(settings.groqApiKey ? { 'x-groq-key': settings.groqApiKey } : {}),
        },
        body: JSON.stringify({
          messages: formattedHistory,
          agentId: activeAgentId,
          modelOverride: settings.selectedModel,
          privacyMode: settings.privacyMode,
          autoFallback: settings.autoFallback,
          userKeys: {
            openai: settings.openaiApiKey,
            gemini: settings.geminiApiKey,
            nvidia: settings.nvidiaApiKey,
            groq: settings.groqApiKey,
          },
        }),
        signal: controller.signal,
      });

      // Extract telemetry headers
      const modelUsed = response.headers.get('X-Model-Used') || undefined;
      const providerUsed = (response.headers.get('X-Provider-Used') as ModelProvider) || undefined;
      const rawFallback = response.headers.get('X-Fallback-Note');
      const fallbackNote = rawFallback ? decodeURIComponent(rawFallback) : undefined;

      if (!response.ok) {
        let errMessage = 'Failed to generate response.';
        try {
          const errJson = await response.json();
          errMessage = errJson.error || errJson.hint || JSON.stringify(errJson);
        } catch {
          errMessage = await response.text();
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `⚠️ **Error reaching model:**\n\n${errMessage}\n\n*Click the gear icon in the top right to check your API keys.*`,
                }
              : msg
          )
        );
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error('No readable response stream received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                accumulatedText += deltaContent;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: accumulatedText,
                          modelUsed,
                          providerUsed,
                          fallbackNote,
                        }
                      : msg
                  )
                );
              }
            } catch {
              // Non-JSON SSE payload; append as text
              accumulatedText += dataStr;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
                )
              );
            }
          } else {
            // Direct text chunk (if provider streams plain text)
            accumulatedText += chunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
              )
            );
            break;
          }
        }
      }

      // Finalize message and save session
      const finalAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: accumulatedText || 'I am ready to help. Please let me know what you need.',
        agentId: activeAgentId,
        timestamp: Date.now(),
        modelUsed,
        providerUsed,
        fallbackNote,
      };

      const finalMessages = [...newMessages, finalAssistantMessage];
      setMessages(finalMessages);

      if (currentSessionId && !settings.privacyMode) {
        // Generate title from first user query if short
        const sessionTitle =
          newMessages.length <= 2 && text
            ? text.slice(0, 36) + (text.length > 36 ? '...' : '')
            : `Chat with ${AGENTS[activeAgentId].name}`;

        const updatedSession: ChatSession = {
          id: currentSessionId,
          title: sessionTitle,
          agentId: activeAgentId,
          messages: finalMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        saveSession(updatedSession);
        setSessions(loadSessions());
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Generation cancelled by user
      } else {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `❌ **Connection error:** ${errorMsg}\n\nPlease check your internet connection or API keys in Settings.`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sessions History Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllHistory}
        onNewChat={() => handleStartNewSession()}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* App Topbar */}
        <Header
          activeAgentId={activeAgentId}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onNewChat={() => handleStartNewSession()}
        />

        {/* Chat Messages Scrollable Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800"
        >
          {/* Agent Banner Selector */}
          <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-3 pb-2">
            <AgentSelector
              activeAgentId={activeAgentId}
              onSelectAgent={handleSwitchAgent}
              onSelectPrompt={(prompt) => handleSendMessage(prompt, [])}
              compact={messages.length > 1}
            />
          </div>

          {/* Messages Stream */}
          <div className="flex flex-col pb-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-28 right-6 z-20 p-2.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white shadow-xl hover:bg-slate-800 transition"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Missing Key Setup Alert (when no keys entered and not server configured) */}
        {!settings.openaiApiKey &&
          !settings.geminiApiKey &&
          !settings.nvidiaApiKey &&
          !settings.groqApiKey && (
            <div className="max-w-3xl mx-auto px-4 w-full mb-1">
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs text-blue-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    No API keys detected. Configure your OpenAI or Gemini key to start chatting.
                  </span>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0 flex items-center gap-1 transition"
                >
                  <Key className="w-3 h-3" />
                  <span>Open Settings</span>
                </button>
              </div>
            </div>
          )}

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-5 max-w-4xl mx-auto w-full pt-1">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onStopGeneration={handleStopGeneration}
            activeAgentId={activeAgentId}
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              {settings.privacyMode ? (
                <span className="text-emerald-400 font-medium">
                  🔒 Privacy Mode Active (Gemini Only • Paid Key Zero-Retention)
                </span>
              ) : (
                <span>
                  ChatGPT {settings.preferredOpenAIModel} ➔ Gemini ➔ NVIDIA ➔ Groq Fallback
                </span>
              )}
            </span>
            <span className="hidden sm:inline">
              Multi-file: Images, PDFs, CSVs, Spreadsheets, Code
            </span>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />
    </div>
  );
}
