'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Printer,
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

interface WorksheetPrintModalProps {
  content: string;
  agentName?: string;
  onClose: () => void;
}

export function WorksheetPrintModal({
  content,
  agentName = 'PrintMatrix',
  onClose,
}: WorksheetPrintModalProps) {
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [copied, setCopied] = useState(false);

  // Common answer key dividers used across agents
  const answerKeyDividers = [
    '--- [ANSWER KEY] ---',
    '--- ANSWER KEY ---',
    '### 🔑 TEACHER & PARENT ANSWER KEY',
    '### 🔑 TEACHER & PARENT ANSWER KEY (Detach or Fold Before Giving to Student)',
    '### Teacher & Parent Answer Key',
    '## Teacher & Parent Answer Key',
    '### Answer Key',
    '## Answer Key',
    '**Answer Key**',
    '### Answers',
    '## Answers',
  ];

  let mainContent = content;
  let answerKeyContent = '';

  for (const divider of answerKeyDividers) {
    if (content.includes(divider)) {
      const parts = content.split(divider);
      mainContent = parts[0];
      break;
    }
  }

  const hasAnswerKey = Boolean(answerKeyContent.trim());

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    try {
      const copyText = showAnswerKey ? content : mainContent;
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Toolbar Header (Hidden on actual print) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/90 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                Worksheet & Document Print Studio
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {agentName}
                </span>
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Formatted for A4/Letter classroom & home printers · PDF Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Answer Key Toggle */}
            {hasAnswerKey && (
              <button
                type="button"
                onClick={() => setShowAnswerKey(!showAnswerKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                  showAnswerKey
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Toggle Answer Key visibility for students or tests"
              >
                {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showAnswerKey ? 'Hide Answer Key' : 'Show Answer Key'}</span>
              </button>
            )}

            {/* Copy Content */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              aria-label="Close print preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Worksheet Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 worksheet-printable-area">
          {/* Printable Student Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex flex-wrap items-center justify-between text-sm font-semibold gap-4 text-slate-900 mb-2">
              <div>
                Name: <span className="inline-block border-b-2 border-dotted border-slate-700 w-44 sm:w-60 ml-1" />
              </div>
              <div>
                Date: <span className="inline-block border-b-2 border-dotted border-slate-700 w-28 sm:w-36 ml-1" />
              </div>
              <div>
                Score: <span className="inline-block border-b-2 border-dotted border-slate-700 w-20 ml-1" />
              </div>
            </div>
          </div>

          {/* Main Worksheet Body */}
          <div className="prose prose-slate max-w-none text-slate-950 leading-relaxed font-sans">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
            >
              {mainContent}
            </ReactMarkdown>

            {/* Answer Key (Displayed only when showAnswerKey is true) */}
            {hasAnswerKey && showAnswerKey && (
              <div className="worksheet-page-break mt-12 pt-8 border-t-2 border-dashed border-slate-400">
                <div className="text-center font-bold text-base text-slate-700 uppercase tracking-widest mb-4">
                  --- Teacher / Parent Answer Key ---
                </div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
                >
                  {answerKeyContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
