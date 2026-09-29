'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import { formatBytes } from '@/lib/attachments';
import { cancelSpeech, speakText } from '@/lib/speech';
import type { Message } from '@/types';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Printer,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Zap,
  Info,
} from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onOpenPrintModal?: (content: string, agentName: string) => void;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 text-slate-100 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-slate-400">
        <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-slate-300">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition px-2 py-0.5 rounded hover:bg-slate-800 active:scale-95"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto leading-relaxed font-mono">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

export function ChatMessage({ message, onOpenPrintModal }: ChatMessageProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [expandedAttachmentId, setExpandedAttachmentId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const isUser = message.role === 'user';
  const agent = message.agentId ? AGENTS[message.agentId] || AGENTS.general : AGENTS.general;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (err) {
      console.error('Failed to copy message', err);
    }
  };

  const handleToggleReadAloud = () => {
    if (isPlayingAudio) {
      cancelSpeech();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      const success = speakText(message.content, {
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
      if (!success) {
        setIsPlayingAudio(false);
      }
    }
  };

  const handlePrint = () => {
    if (onOpenPrintModal) {
      onOpenPrintModal(message.content, agent.name);
    } else {
      window.print();
    }
  };

  // Estimate token usage if not provided
  const estTokens =
    message.totalTokens ||
    Math.round(message.content.length / 4) + (isUser ? 20 : 60);

  const latencyFormatted = message.latencyMs
    ? `${(message.latencyMs / 1000).toFixed(2)}s`
    : null;

  return (
    <div
      className={`py-5 px-3 sm:px-6 transition-colors border-b ${
        isUser
          ? 'bg-slate-100/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-900/60'
          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 shadow-xs'
      }`}
    >
      <div className="w-full max-w-5xl mx-auto flex gap-3 sm:gap-4.5">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              You
            </div>
          ) : (
            <div
              className={`w-8 h-8 rounded-xl ${agent.color.bg} border ${agent.color.border} flex items-center justify-center ${agent.color.text} shadow-sm ${agent.color.glow}`}
            >
              <AgentIcon name={agent.iconName} className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0">
          {/* Header Metadata */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {isUser ? 'You' : agent.name}
            </span>

            {!isUser && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono font-medium">
                {message.modelUsed || 'Default'}
              </span>
            )}

            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* User Attachments Display */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3.5 flex flex-wrap gap-2">
              {message.attachments.map((att) => {
                const isImage = att.category === 'image';
                const isExpanded = expandedAttachmentId === att.id;

                return (
                  <div
                    key={att.id}
                    className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden max-w-xs text-xs shadow-xs"
                  >
                    {isImage ? (
                      <div className="relative group cursor-pointer" onClick={() => setPreviewImageUrl(att.dataUrl)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="h-28 w-48 object-cover rounded-t-xl transition group-hover:opacity-90"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 flex items-center gap-2">
                        {att.category === 'pdf' ? (
                          <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                        ) : att.category === 'tabular' ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : att.category === 'code' ? (
                          <FileCode className="w-5 h-5 text-cyan-500 shrink-0" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-200 truncate">{att.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {formatBytes(att.size)} • {att.category.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Extracted text expander for documents/CSVs */}
                    {att.extractedText && (
                      <div className="border-t border-slate-200 dark:border-slate-800 px-2.5 py-1 bg-slate-50 dark:bg-slate-950/60">
                        <button
                          onClick={() => setExpandedAttachmentId(isExpanded ? null : att.id)}
                          className="w-full flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        >
                          <span>{isExpanded ? 'Hide parsed content' : 'Inspect parsed content'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-1.5 p-2 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-800 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {att.extractedText}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Message Content: Markdown with KaTeX & Tables */}
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 leading-relaxed break-words text-sm sm:text-base">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeText = String(children).replace(/\n$/, '');
                  const isInline = !match && !codeText.includes('\n');

                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  }

                  return <CodeBlock language={match ? match[1] : 'text'} code={codeText} />;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Auto-route / Fallback Explanation Notice at End of Message */}
          {!isUser && message.fallbackNote && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Auto-Route Fallback Notice:</strong>
                <span className="leading-relaxed">{message.fallbackNote}</span>
              </div>
            </div>
          )}

          {/* Action Footer for Assistant Messages */}
          {!isUser && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Copy Full Message */}
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
                  title="Copy full message"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* Read Aloud Voice */}
                <button
                  onClick={handleToggleReadAloud}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition border ${
                    isPlayingAudio
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 border-transparent'
                  }`}
                  title={isPlayingAudio ? 'Stop voice playback' : 'Read aloud with natural voice'}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read Aloud</span>
                    </>
                  )}
                </button>

                {/* Print Worksheet or Document */}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
                  title="Open Print & PDF Studio (worksheet view with answer key toggle)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>

              {/* Chat Response Telemetry & Stats */}
              <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
                {latencyFormatted && (
                  <span className="flex items-center gap-1" title="Response generation latency">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{latencyFormatted}</span>
                  </span>
                )}
                <span className="flex items-center gap-1" title="Estimated tokens">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>~{estTokens} toks</span>
                </span>
                {message.providerUsed && (
                  <span className="flex items-center gap-1" title="Inference Provider">
                    <Cpu className="w-3 h-3 text-blue-400" />
                    <span className="uppercase">{message.providerUsed}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Lightbox Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="Attachment full preview" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-full border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
