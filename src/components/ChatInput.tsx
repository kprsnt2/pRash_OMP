'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { processFileToAttachment, formatBytes } from '@/lib/attachments';
import { AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';
import type { Attachment, AgentId } from '@/types';
import {
  Paperclip,
  Send,
  Square,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  UploadCloud,
  Mic,
  MicOff,
  ChevronDown,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  onStopGeneration: () => void;
  activeAgentId: AgentId;
  onOpenAgentModal?: () => void;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  onStopGeneration,
  activeAgentId,
  onOpenAgentModal,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAgent = AGENTS[activeAgentId] || AGENTS.general;

  // Voice input speech recognition
  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition({
    onResult: (transcription) => {
      setText((prev) => {
        // Append transcribed speech naturally
        if (!prev.trim()) return transcription;
        if (prev.endsWith(' ')) return prev + transcription;
        return `${prev} ${transcription}`;
      });
    },
  });

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  // Process incoming files from input, drop, or paste
  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const attachment = await processFileToAttachment(file);
        newAttachments.push(attachment);
      } catch (err) {
        console.error(`Failed to process attachment ${file.name}`, err);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsProcessingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleAddFiles(e.dataTransfer.files);
    }
  };

  // Handle Paste from Clipboard (Ctrl+V images / files)
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!e.clipboardData || !e.clipboardData.files || e.clipboardData.files.length === 0) {
      return;
    }
    const files = e.clipboardData.files;
    await handleAddFiles(files);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAllAttachments = () => {
    setAttachments([]);
  };

  const handleSend = () => {
    if (isLoading) return;
    if (!text.trim() && attachments.length === 0) return;

    if (isListening) stopListening();

    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholder = () => {
    if (isListening) {
      return '🎙️ Listening... speak clearly into your microphone';
    }
    switch (activeAgentId) {
      case 'kidstory':
        return 'Tell me child\'s name, age, bedtime theme, or moral...';
      case 'doctor':
        return 'Ask a medical/prescription question or attach lab report photos...';
      case 'worksheet':
        return 'Enter topic, grade level, and question count (e.g. Grade 4 fractions)...';
      case 'dataanalyst':
        return 'Ask about Tableau LODs, Looker Studio fields, SQL, or paste CSV...';
      case 'coder':
        return 'Paste code to refactor, describe a feature, or paste error trace...';
      case 'studybuddy':
        return 'Ask about any difficult concept or formula you want broken down...';
      default:
        return 'Type your prompt, or drag & drop files (PDFs, images, CSVs, code)...';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900/90 shadow-xl ${
        isDragging
          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50 dark:bg-blue-950/20'
          : isListening
          ? 'border-rose-500/60 ring-2 ring-rose-500/20'
          : 'border-slate-300 dark:border-slate-800 focus-within:border-slate-400 dark:focus-within:border-slate-700'
      }`}
    >
      {/* Dragging Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 rounded-2xl bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-blue-400 text-blue-300">
          <UploadCloud className="w-10 h-10 mb-2 animate-bounce" />
          <p className="text-sm font-semibold">Drop files here to attach</p>
          <p className="text-xs text-slate-400 mt-1">
            Images, PDFs, CSVs, spreadsheets, code, & text files supported
          </p>
        </div>
      )}

      {/* Attachment Staging Tray */}
      {attachments.length > 0 && (
        <div className="px-3.5 pt-3 pb-1 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>📎 Staged Attachments ({attachments.length})</span>
            </span>
            <button
              onClick={handleClearAllAttachments}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pb-1 scrollbar-thin">
            {attachments.map((att) => {
              const isImage = att.category === 'image';
              return (
                <div
                  key={att.id}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs group relative max-w-xs"
                >
                  {isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {att.category === 'pdf' ? (
                        <FileText className="w-4 h-4 text-rose-400" />
                      ) : att.category === 'tabular' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      ) : att.category === 'code' ? (
                        <FileCode className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 truncate font-medium">{att.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatBytes(att.size)} • {att.category}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Agent Switcher Badge Strip */}
      <div className="px-3.5 pt-2 pb-1 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/40">
        {onOpenAgentModal ? (
          <button
            type="button"
            onClick={onOpenAgentModal}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Switch agent persona for this next message"
          >
            <AgentIcon name={currentAgent.iconName} className={`w-3.5 h-3.5 ${currentAgent.color.text}`} />
            <span className="font-medium">{currentAgent.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <AgentIcon name={currentAgent.iconName} className={`w-3.5 h-3.5 ${currentAgent.color.text}`} />
            <span>Responding as <strong>{currentAgent.name}</strong></span>
          </div>
        )}

        {isListening && (
          <div className="flex items-center gap-1.5 text-rose-400 font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Listening to voice...</span>
          </div>
        )}
      </div>

      {/* Main Textarea and Controls */}
      <div className="flex items-end gap-2 p-3">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
          accept="image/*,application/pdf,.csv,.tsv,.xlsx,.xls,.txt,.md,.json,.sql,.py,.js,.ts,.tsx,.jsx,.html,.css,.yaml,.yml,.xml,.log"
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFiles}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition shrink-0 relative"
          title="Attach multiple files (Images, PDFs, CSVs, Code, Spreadsheets)"
        >
          <Paperclip className="w-4 h-4" />
          {isProcessingFiles && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          )}
        </button>

        {/* Voice Input Microphone Button */}
        {isSpeechSupported && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-2.5 rounded-xl transition shrink-0 ${
              isListening
                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/50 shadow-md shadow-rose-600/30 animate-pulse'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isListening ? 'Click to stop dictation' : 'Click to speak / dictate message'}
          >
            {isListening ? <Mic className="w-4 h-4 text-rose-400" /> : <MicOff className="w-4 h-4" />}
          </button>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={getPlaceholder()}
          rows={1}
          className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none resize-none leading-relaxed py-1.5 max-h-48 scrollbar-thin"
        />

        {/* Send / Stop Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStopGeneration}
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shrink-0 shadow-md shadow-rose-600/30 active:scale-95"
            title="Stop generation"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() && attachments.length === 0}
            className={`p-2.5 rounded-xl transition shrink-0 shadow-md active:scale-95 ${
              text.trim() || attachments.length > 0
                ? `${currentAgent.color.bg} ${currentAgent.color.text} border ${currentAgent.color.border} hover:opacity-90`
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
            }`}
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
