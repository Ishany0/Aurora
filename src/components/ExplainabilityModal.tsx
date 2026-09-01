import React from "react";
import {
  HelpCircle,
  X,
  FileText,
  Calendar,
  Tag,
  Gauge,
  CheckCircle2,
  ShieldCheck,
  EyeOff,
} from "lucide-react";
import type { PatternEvidenceDetail } from "../types.js";

interface ExplainabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  evidence: PatternEvidenceDetail | {
    entriesCount: number;
    dateRange?: string;
    repeatedTopics?: string[];
    confidence: "high" | "medium" | "low";
    userConfirmedCorrectionsUsed?: boolean;
    explanationSummary?: string;
  };
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({
  isOpen,
  onClose,
  title,
  evidence,
}) => {
  if (!isOpen) return null;

  const confidenceBadgeStyles = {
    high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  }[evidence.confidence] || "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6"
        role="dialog"
        aria-labelledby="explainability-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                Transparent Synthesis Evidence
              </span>
              <h3 id="explainability-title" className="text-base font-bold text-white font-display">
                Why am I seeing this?
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close explainability panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Insight Subject */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Target Pattern / Insight
          </span>
          <p className="text-sm font-semibold text-slate-200 font-serif">
            &ldquo;{title}&rdquo;
          </p>
        </div>

        {/* Evidence Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Metric 1: Entry Count */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Supporting Records</span>
            </div>
            <div className="text-sm font-bold text-white font-mono">
              {evidence.entriesCount} {evidence.entriesCount === 1 ? "entry" : "entries"} cited
            </div>
            <span className="text-[10px] text-slate-500 block">
              Directly grounded in your saved reflections
            </span>
          </div>

          {/* Metric 2: Date Range */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Observation Period</span>
            </div>
            <div className="text-xs font-bold text-white truncate">
              {evidence.dateRange || "Recent reflections"}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Aggregated across active window
            </span>
          </div>

          {/* Metric 3: Confidence Score */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Synthesis Confidence</span>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${confidenceBadgeStyles}`}
            >
              {evidence.confidence}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Based on keyword & mood consistency
            </span>
          </div>

          {/* Metric 4: User Calibration */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>User Calibration</span>
            </div>
            <div className="text-xs font-bold text-slate-200">
              {evidence.userConfirmedCorrectionsUsed
                ? "Applied user overrides"
                : "Standard classification"}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Respects personal tag corrections
            </span>
          </div>
        </div>

        {/* Repeated Topics */}
        {evidence.repeatedTopics && evidence.repeatedTopics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Tag className="w-3.5 h-3.5 text-teal-400" />
              <span>Recurring Subject Tags Found:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {evidence.repeatedTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Plain-Language Explanation Summary */}
        {evidence.explanationSummary && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-200 leading-relaxed">
            <p className="font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Grounding Statement</span>
            </p>
            <p className="text-slate-300">{evidence.explanationSummary}</p>
          </div>
        )}

        {/* Privacy & Zero-Chain-of-Thought Guarantee */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
          <EyeOff className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <span>
            <strong>Zero Chain-of-Thought Leakage:</strong> Internal model thinking traces are strictly redacted. Aurora only surfaces concise, verifiable evidence derived from your private, owner-isolated journal records.
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
