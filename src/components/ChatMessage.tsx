'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import { formatBytes } from '@/lib/attachments';
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
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ChatMessageProps {
  message: Message;
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
    <div className="relative my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-slate-400">
        <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-slate-300">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition px-2 py-0.5 rounded hover:bg-slate-800"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel(); // stop any current speech
    // Clean markdown symbols for cleaner speech output
    const cleanText = message.content
      .replace(/#+\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // slightly slower, calming bedtime pace
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print.');
      return;
    }

    printWindow.document.documentElement.innerHTML = `
      <head>
        <title>${agent.name} - Printout</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #111827;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
          h1 { font-size: 22px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
          pre { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; }
          .print-page-break { page-break-before: always; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 20px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
          <strong>Generated by OmniChat: ${agent.name}</strong> • ${new Date(message.timestamp).toLocaleString()}
        </div>
        <div class="content">
          ${message.content
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/### (.*?)(<br\/>|$)/g, '<h3>$1</h3>')
            .replace(/## (.*?)(<br\/>|$)/g, '<h2>$1</h2>')
            .replace(/# (.*?)(<br\/>|$)/g, '<h1>$1</h1>')}
        </div>
      </body>
    `;
    printWindow.onload = () => {
      printWindow.print();
    };
    setTimeout(() => {
      printWindow.print();
    }, 300);
    printWindow.document.close();
  };

  return (
    <div
      className={`py-4 px-3 sm:px-6 transition-colors ${
        isUser ? 'bg-slate-950/40' : 'bg-slate-900/30 border-y border-slate-900'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-semibold text-white">
              You
            </div>
          ) : (
            <div
              className={`w-8 h-8 rounded-lg ${agent.color.bg} border ${agent.color.border} flex items-center justify-center ${agent.color.text} shadow-sm ${agent.color.glow}`}
            >
              <AgentIcon name={agent.iconName} className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0">
          {/* Header Metadata */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-200">
              {isUser ? 'You' : agent.name}
            </span>

            {!isUser && message.modelUsed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
                {message.providerUsed ? `${message.providerUsed.toUpperCase()} • ` : ''}
                {message.modelUsed}
              </span>
            )}

            <span className="text-[11px] text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Fallback Notice if triggered */}
          {message.fallbackNote && (
            <div className="mb-2.5 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{message.fallbackNote}</span>
            </div>
          )}

          {/* User Attachments Display */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.attachments.map((att) => {
                const isImage = att.category === 'image';
                const isExpanded = expandedAttachmentId === att.id;

                return (
                  <div
                    key={att.id}
                    className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/90 overflow-hidden max-w-xs text-xs"
                  >
                    {isImage ? (
                      <div className="relative group cursor-pointer" onClick={() => setPreviewImageUrl(att.dataUrl)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="h-28 w-48 object-cover rounded-t-lg transition group-hover:opacity-90"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 flex items-center gap-2">
                        {att.category === 'pdf' ? (
                          <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                        ) : att.category === 'tabular' ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : att.category === 'code' ? (
                          <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-200 truncate">{att.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {formatBytes(att.size)} • {att.category.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Extracted text expander for documents/CSVs */}
                    {att.extractedText && (
                      <div className="border-t border-slate-800 px-2.5 py-1 bg-slate-950/60">
                        <button
                          onClick={() => setExpandedAttachmentId(isExpanded ? null : att.id)}
                          className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200"
                        >
                          <span>{isExpanded ? 'Hide parsed content' : 'Inspect parsed content'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-1.5 p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
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
          <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeText = String(children).replace(/\n$/, '');
                  const isInline = !match && !codeText.includes('\n');

                  if (isInline) {
                    return (
                      <code className={className} {...props}>
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

          {/* Action Footer for Assistant Messages */}
          {!isUser && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-2 flex-wrap text-xs text-slate-400">
              {/* Copy Full Message */}
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Copy response"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Read Aloud Voice for KidStory and Bedtime / Spiritual */}
              {agent.features.supportsReadAloud && (
                <button
                  onClick={handleToggleReadAloud}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition border ${
                    isPlayingAudio
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-amber-300 border-transparent'
                  }`}
                  title="Read aloud with comforting voice"
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read Aloud</span>
                    </>
                  )}
                </button>
              )}

              {/* Print Worksheet or Medical Report */}
              {agent.features.supportsPrint && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
                  title="Print clean worksheet or save to PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              )}
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
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="Attachment full preview" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 px-3 py-1 bg-black/70 hover:bg-black text-white text-xs rounded-full border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
