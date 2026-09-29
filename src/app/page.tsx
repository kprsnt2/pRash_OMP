'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { AgentSelector } from '@/components/AgentSelector';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Sidebar } from '@/components/Sidebar';
import { SettingsModal } from '@/components/SettingsModal';
import { AgentModal } from '@/components/AgentModal';
import { AuthModal } from '@/components/AuthModal';
import { WorksheetPrintModal } from '@/components/WorksheetPrintModal';
import { AGENTS } from '@/lib/agents';
import { formatUserMessageWithAttachments } from '@/lib/attachments';
import {
  loadSettings,
  saveSettings,
  loadSessions,
  saveSession,
  deleteSession,
  clearAllSessions,
  loadTheme,
  saveTheme,
  exportChatSession,
  exportAllSessions,
  parseChatBackup,
  importSession,
  importSessions,
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('kidstory');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [printModalData, setPrintModalData] = useState<{
    isOpen: boolean;
    content: string;
    agentName: string;
  }>({
    isOpen: false,
    content: '',
    agentName: 'PrintMatrix',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (data && typeof data.authenticated === 'boolean') {
          setIsAuthenticated(data.authenticated);
        }
      } catch {
        // network issue: default to authenticated in dev
      }
    }
    checkAuth();
  }, []);

  // Initialize theme, settings, and sessions
  useEffect(() => {
    const activeTheme = loadTheme();
    setTheme(activeTheme);
    saveTheme(activeTheme);

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
      handleStartNewSession('kidstory', loadedSettings.privacyMode);
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

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

  /** Switch agent persona cleanly in the middle of a chat or at start */
  const handleSwitchAgent = (agentId: AgentId) => {
    const newAgent = AGENTS[agentId] || AGENTS.general;
    setActiveAgentId(agentId);

    if (messages.length <= 1) {
      // Empty or welcome only: replace welcome message with new agent's intro
      const initialMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: newAgent.welcomeMessage,
        agentId,
        timestamp: Date.now(),
      };
      setMessages([initialMessage]);

      if (currentSessionId && !settings.privacyMode) {
        const updatedSession: ChatSession = {
          id: currentSessionId,
          title: `Chat with ${newAgent.name}`,
          agentId,
          messages: [initialMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveSession(updatedSession);
        setSessions(loadSessions());
      }
    } else {
      // In the middle of an ongoing chat: append visual switch pill and preserve history!
      const switchDivider: Message = {
        id: `switch-${Date.now()}`,
        role: 'system',
        content: `🔀 **Switched to ${newAgent.name}** (*${newAgent.tagline}*). Subsequent responses will use ${newAgent.name}'s specialized expertise!`,
        agentId,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, switchDivider];
      setMessages(updatedMessages);

      if (currentSessionId && !settings.privacyMode) {
        const current = sessions.find((s) => s.id === currentSessionId);
        if (current) {
          const updatedSession: ChatSession = {
            ...current,
            agentId,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
          saveSession(updatedSession);
          setSessions(loadSessions());
        }
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

  // Export current active session to JSON
  const handleExportCurrentChat = () => {
    const current = sessions.find((s) => s.id === currentSessionId);
    if (current) {
      exportChatSession(current);
    } else {
      const tempSession: ChatSession = {
        id: currentSessionId || `session-${Date.now()}`,
        title: `Chat with ${AGENTS[activeAgentId].name}`,
        agentId: activeAgentId,
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      exportChatSession(tempSession);
    }
  };

  // Export all sessions backup
  const handleExportAll = () => {
    exportAllSessions(sessions);
  };

  // Import chat backup and resume session immediately
  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseChatBackup(text);

      if (parsed.session) {
        const imported = importSession(parsed.session);
        const updatedSessions = loadSessions();
        setSessions(updatedSessions);
        setCurrentSessionId(imported.id);
        setMessages(imported.messages);
        setActiveAgentId(imported.agentId);
        alert(`Successfully imported "${imported.title}". You can now resume chatting!`);
      } else if (parsed.sessions && parsed.sessions.length > 0) {
        importSessions(parsed.sessions);
        const updatedSessions = loadSessions();
        setSessions(updatedSessions);
        const first = updatedSessions[0];
        setCurrentSessionId(first.id);
        setMessages(first.messages);
        setActiveAgentId(first.agentId);
        alert(`Successfully imported ${parsed.count} chat conversations!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid chat backup JSON file.';
      alert(`Import failed: ${msg}`);
    }
  };

  // Lock workspace
  const handleLockWorkspace = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  // Print Worksheet modal opener
  const handleOpenPrintModal = (content: string, agentName: string) => {
    setPrintModalData({
      isOpen: true,
      content,
      agentName,
    });
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
    const sendStartTime = Date.now();

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
      const latencyHeader = response.headers.get('X-Latency-Ms');

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
                  content: `⚠️ **Error reaching model:**\n\n${errMessage}\n\n*Click the gear icon in the top right to check your API keys or fallback settings.*`,
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
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const trimmed = rawLine.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              // Handle server normalized text payload or choices delta
              const textToken = parsed.text ?? parsed.delta ?? parsed.choices?.[0]?.delta?.content;
              if (typeof textToken === 'string' && textToken) {
                accumulatedText += textToken;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: accumulatedText,
                          modelUsed,
                          providerUsed,
                          fallbackNote,
                          latencyMs: Date.now() - sendStartTime,
                        }
                      : msg
                  )
                );
              }
            } catch {
              // Ignore unparsed or keepalive chunks; NEVER dump raw unparsed JSON into message
            }
          }
        }
      }

      const finalLatency = latencyHeader ? parseInt(latencyHeader, 10) : Date.now() - sendStartTime;

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
        latencyMs: finalLatency,
        totalTokens: Math.round(accumulatedText.length / 4) + 60,
      };

      const finalMessages = [...newMessages, finalAssistantMessage];
      setMessages(finalMessages);

      if (currentSessionId && !settings.privacyMode) {
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
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
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
        onExportSession={exportChatSession}
        onExportAll={handleExportAll}
        onImportBackup={handleImportBackup}
        onLockWorkspace={handleLockWorkspace}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* App Topbar */}
        <Header
          activeAgentId={activeAgentId}
          settings={settings}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onUpdateSettings={handleUpdateSettings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onNewChat={() => handleStartNewSession()}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
          onExportCurrentChat={handleExportCurrentChat}
          onLockWorkspace={handleLockWorkspace}
        />

        {/* Chat Messages Scrollable Area (Fills space nicely) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800"
        >
          {/* Agent Banner Selector */}
          <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-2">
            <AgentSelector
              activeAgentId={activeAgentId}
              onSelectAgent={handleSwitchAgent}
              onSelectPrompt={(prompt) => handleSendMessage(prompt, [])}
              onOpenAgentModal={() => setIsAgentModalOpen(true)}
              compact={messages.length > 1}
            />
          </div>

          {/* Messages Stream */}
          <div className="flex flex-col pb-4">
            {messages.map((message) => {
              if (message.role === 'system') {
                return (
                  <div key={message.id} className="w-full max-w-5xl mx-auto px-4 py-2 my-1">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                      <span className="font-sans">{message.content}</span>
                    </div>
                  </div>
                );
              }
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onOpenPrintModal={handleOpenPrintModal}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-28 right-6 z-20 p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Missing Key Setup Alert (when no keys entered) */}
        {!settings.openaiApiKey &&
          !settings.geminiApiKey &&
          !settings.nvidiaApiKey &&
          !settings.groqApiKey && (
            <div className="max-w-4xl mx-auto px-4 w-full mb-1">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    No external API keys detected. Built-in smart fallback is active. Add keys in Settings to connect to frontier cloud models.
                  </span>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0 flex items-center gap-1 transition"
                >
                  <Key className="w-3 h-3" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          )}

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-5 max-w-5xl mx-auto w-full pt-1">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onStopGeneration={handleStopGeneration}
            activeAgentId={activeAgentId}
            onOpenAgentModal={() => setIsAgentModalOpen(true)}
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span>
              {settings.privacyMode ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  🔒 Privacy Mode Active (Gemini Only • Paid Key Zero-Retention)
                </span>
              ) : (
                <span>
                  Frontier Models ➔ Auto-routed fallback with full error recovery
                </span>
              )}
            </span>
            <span className="hidden sm:inline">
              Multi-file: Images, PDFs, CSVs, Spreadsheets, Code · Dictation ready
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

      {/* Categorized & Searchable Agent Picker Modal */}
      <AgentModal
        isOpen={isAgentModalOpen}
        activeAgentId={activeAgentId}
        onSelectAgent={handleSwitchAgent}
        onClose={() => setIsAgentModalOpen(false)}
      />

      {/* Password Authentication Gate Modal */}
      <AuthModal
        isOpen={!isAuthenticated}
        onSuccess={() => setIsAuthenticated(true)}
      />

      {/* Worksheet & Document Print Studio Modal */}
      {printModalData.isOpen && (
        <WorksheetPrintModal
          content={printModalData.content}
          agentName={printModalData.agentName}
          onClose={() => setPrintModalData((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
