import React, { useState } from "react";
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  AlertTriangle,
  Server,
  ToggleLeft,
  ToggleRight,
  Database,
  Cpu,
} from "lucide-react";
import type { UserSettings } from "../types.js";
import {
  exportAllUserData,
  exportMarkdownJournal,
  wipeAllUserData,
  saveStoredSettings,
} from "../lib/storage.js";

interface SecurityPanelProps {
  settings: UserSettings;
  onSettingsChange: (updated: UserSettings) => void;
  onDataWiped: () => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  settings,
  onSettingsChange,
  onDataWiped,
}) => {
  // Test Runner state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any | null>(null);

  // Download status
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const runSecurityRuleTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch("/api/rules-test");
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      console.error("Error executing security tests:", err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = exportAllUserData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora_journal_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess("Full JSON archive downloaded successfully.");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleExportMarkdown = () => {
    const mdStr = exportMarkdownJournal();
    const blob = new Blob([mdStr], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora_reflections_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess("Markdown reflection journal downloaded.");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleTogglePhoto = () => {
    const updated: UserSettings = {
      ...settings,
      enablePhotoAnalysis: !settings.enablePhotoAnalysis,
      updatedAt: new Date().toISOString(),
    };
    saveStoredSettings(updated);
    onSettingsChange(updated);
  };

  const handleTogglePatterns = () => {
    const updated: UserSettings = {
      ...settings,
      enableWeeklyPatterns: !settings.enableWeeklyPatterns,
      updatedAt: new Date().toISOString(),
    };
    saveStoredSettings(updated);
    onSettingsChange(updated);
  };

  const handleFullWipe = () => {
    if (
      window.confirm(
        "WARNING: This will permanently delete all your reflections, calibration memory, and companion stats from this device. Are you sure?"
      )
    ) {
      if (window.confirm("Please confirm a second time: permanently delete everything?")) {
        wipeAllUserData();
        onDataWiped();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Trust Security & Data Sovereignty</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight font-display">
          Privacy & Security Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Verify security invariants, manage user permissions, and control your private reflection data.
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Live Security Rules Emulator Runner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Automated Firestore Security Rules Suite</span>
            </div>
            <p className="text-xs text-slate-400">
              Validates owner-bound access, cross-user denial, unauthenticated rejection, and RBAC policies.
            </p>
          </div>

          <button
            onClick={runSecurityRuleTests}
            disabled={isRunningTests}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all self-start shadow-md"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute Rules Suite</span>
              </>
            )}
          </button>
        </div>

        {/* Results Matrix */}
        {testResults ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-mono text-emerald-400 font-bold">
                {testResults.summary.passed}/{testResults.summary.total} Invariants Verified
              </span>
              <span className="text-[11px] text-slate-500">
                Executed in {testResults.summary.durationMs}ms
              </span>
            </div>

            <div className="space-y-2">
              {testResults.results.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                    r.passed
                      ? "bg-slate-950/60 border-slate-800/80 text-slate-200"
                      : "bg-rose-950/30 border-rose-800/80 text-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{r.testCase}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Path: {r.path} | Op: {r.operation}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      r.passed
                        ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                        : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    }`}
                  >
                    {r.passed ? "PASSED" : "FAILED"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 text-xs text-slate-500 text-center">
            Click &ldquo;Execute Rules Suite&rdquo; to test security rules against the simulated security matrix.
          </div>
        )}
      </div>

      {/* Data Sovereignty & User Controls */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>User Data Sovereignty Controls</span>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3 divide-y divide-slate-800">
          
          <div className="pt-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">Multimodal Photo Analysis</div>
              <div className="text-[11px] text-slate-400">
                Allow Gemini to analyze attached photos alongside journal text.
              </div>
            </div>
            <button
              onClick={handleTogglePhoto}
              className="text-teal-400 hover:text-teal-300 p-1"
            >
              {settings.enablePhotoAnalysis ? (
                <ToggleRight className="w-7 h-7 text-teal-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-600" />
              )}
            </button>
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">Weekly Pattern Digest Synthesis</div>
              <div className="text-[11px] text-slate-400">
                Synthesize recurring themes and emotional momentum across your past reflections.
              </div>
            </div>
            <button
              onClick={handleTogglePatterns}
              className="text-teal-400 hover:text-teal-300 p-1"
            >
              {settings.enableWeeklyPatterns ? (
                <ToggleRight className="w-7 h-7 text-teal-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-600" />
              )}
            </button>
          </div>

        </div>

        {/* Export and Wipe Buttons */}
        <div className="pt-3 flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Complete JSON Archive</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Markdown Journal</span>
          </button>

          <button
            onClick={handleFullWipe}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 text-xs font-semibold transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Permanently Delete All Data</span>
          </button>
        </div>

      </div>

      {/* Threat Modeling Summary */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>Agentic Threat Model & Architectural Countermeasures</span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2 pr-4">Threat Zone</th>
                <th className="py-2 pr-4">Primary Risk</th>
                <th className="py-2">Mitigation Invariant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Input Surfaces</td>
                <td className="py-2.5 pr-4">Prompt injection via diary content / photo</td>
                <td className="py-2.5">Strict delimiter wrapping, multimodal schema typing</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Tool Execution</td>
                <td className="py-2.5 pr-4">Denial of wallet via unbounded API loops</td>
                <td className="py-2.5">Strict per-user rate limits, fallback ladder</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Memory & State</td>
                <td className="py-2.5 pr-4">Cross-user reflection reading / leakage</td>
                <td className="py-2.5">Owner-bound Firestore rules (request.auth.uid == userId)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Sensitive Distress</td>
                <td className="py-2.5 pr-4">Ill-suited clinical advice or webhook leakage</td>
                <td className="py-2.5">concern_flag isolation, immediate 988 emergency banner</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
