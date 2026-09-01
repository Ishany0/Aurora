import React, { useState } from "react";
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Layers,
  Calendar,
  Shield,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import type { JournalEntry, WeeklyInsightResult } from "../types.js";
import { getCachedInsights, setCachedInsights } from "../lib/storage.js";

interface PatternDigestViewProps {
  entries: JournalEntry[];
  userId: string;
}

export const PatternDigestView: React.FC<PatternDigestViewProps> = ({ entries, userId }) => {
  const [insights, setInsights] = useState<WeeklyInsightResult | null>(getCachedInsights());
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter out crisis entries from weekly patterns for privacy & safety
  const eligibleEntries = entries.filter((e) => !e.concern_flag);

  // Compute mood distribution
  const moodCounts: Record<string, number> = {};
  eligibleEntries.forEach((e) => {
    const mood = e.userMoodOverride || e.mood || "Reflective";
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });

  const totalCount = eligibleEntries.length;

  const handleSynthesizeInsights = async () => {
    if (eligibleEntries.length < 2) {
      setErrorMessage("At least 2 reflections are needed to detect recurring patterns.");
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      // Prepare compact privacy-safe summary (only mood + topics + short snippet)
      const entriesSummary = eligibleEntries.map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString(),
        mood: e.userMoodOverride || e.mood || "Reflective",
        topics: e.topics || ["General"],
        snippet: e.content.slice(0, 120),
      }));

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ entriesSummary }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const result: WeeklyInsightResult = data.insightResult;
      setInsights(result);
      setCachedInsights(result);
    } catch (err: any) {
      console.error("Failed to generate insight digest:", err);
      setErrorMessage("Could not synthesize insight patterns at this moment.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Weekly Pattern & Growth Digest</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-display">
            Reflection Patterns
          </h1>
          <p className="text-sm text-slate-400">
            Identifies recurring themes, emotional rhythm, and momentum across your reflections.
          </p>
        </div>

        <button
          onClick={handleSynthesizeInsights}
          disabled={isSynthesizing || eligibleEntries.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg self-start ${
            !isSynthesizing && eligibleEntries.length > 0
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isSynthesizing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-300" />
              <span>Analyzing Themes...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{insights ? "Refresh Pattern Digest" : "Generate Pattern Digest"}</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mood Distribution Overview Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>Emotional States Distribution</span>
          </div>
          <span className="text-xs text-slate-400">{totalCount} reflections evaluated</span>
        </div>

        {totalCount === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No reflections recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(moodCounts).map(([mood, count], idx) => {
              const percentage = Math.round((count / totalCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{mood}</span>
                    <span className="text-slate-400 font-mono">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Synthesized Insights Section */}
      {insights ? (
        <div className="space-y-6">
          
          {/* Executive Summary Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Synthesized Weekly Overview</span>
            </div>
            <p className="text-sm text-slate-100 leading-relaxed font-serif italic">
              &ldquo;{insights.overview}&rdquo;
            </p>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800">
              <Calendar className="w-3.5 h-3.5" />
              <span>Time window: {insights.timeframe}</span>
            </div>
          </div>

          {/* Recurring Patterns List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Identified Recurring Themes & Evidence</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.patterns.map((p, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{p.theme}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-[10px] font-bold border border-teal-500/20 whitespace-nowrap">
                      {p.occurrences}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{p.observation}</p>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-300">Evidence Citation: </strong>
                      {p.evidenceCitation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forward Actionable Suggestion */}
          {insights.forwardSuggestion && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-teal-500/30 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-300 shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
                  Recommended Focus for Next Week
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {insights.forwardSuggestion}
                </p>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <Lightbulb className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">Pattern Digest Not Yet Synthesized</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &ldquo;Generate Pattern Digest&rdquo; to analyze recurring themes and cited evidence across your journal entries.
          </p>
        </div>
      )}

      {/* Privacy Guarantee Box */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-400" />
          <span>Pattern analysis uses privacy-preserving summaries. Any sensitive crisis entries are strictly omitted.</span>
        </div>
      </div>

    </div>
  );
};
