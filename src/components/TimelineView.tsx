import React, { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  Tag,
  Clock,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Mic,
  Image as ImageIcon,
  FileText,
  Sparkles,
  HelpCircle,
  Check,
  X,
  EyeOff,
  BarChart3,
  Download,
  Shield,
  RotateCcw,
} from "lucide-react";
import type { JournalEntry, ActionStatus } from "../types.js";
import {
  upsertEntry,
  deleteEntry,
  saveCorrection,
  removeMoodTag,
  toggleExcludeFromDigest,
  exportAllUserData,
  exportMarkdownJournal,
} from "../lib/storage.js";

interface TimelineViewProps {
  entries: JournalEntry[];
  userId: string;
  onEntriesChange: (updated: JournalEntry[]) => void;
  onNavigateToReflect?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  userId,
  onEntriesChange,
  onNavigateToReflect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [selectedModality, setSelectedModality] = useState<string>("all");
  
  // Editing entry state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  // Mood correction / removal state
  const [correctingEntryId, setCorrectingEntryId] = useState<string | null>(null);
  const [correctedMoodInput, setCorrectedMoodInput] = useState("");

  // Explainability expand state
  const [expandedExplainId, setExpandedExplainId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Available unique moods for filtering
  const allMoods = Array.from(
    new Set(entries.map((e) => e.userMoodOverride || e.mood).filter(Boolean))
  ) as string[];

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.reflection && entry.reflection.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.topics && entry.topics.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const currentMood = entry.userMoodOverride || entry.mood || "Reflective";
    const matchesMood = selectedMood === "all" || currentMood.toLowerCase() === selectedMood.toLowerCase();
    const matchesModality = selectedModality === "all" || entry.source === selectedModality;

    return matchesSearch && matchesMood && matchesModality;
  });

  const showFeedback = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 4000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this private reflection? This cannot be undone.")) {
      deleteEntry(userId, id);
      onEntriesChange(entries.filter((e) => e.id !== id));
      showFeedback("Reflection permanently deleted.");
    }
  };

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setEditContent(entry.content);
  };

  const handleSaveEdit = (entry: JournalEntry) => {
    if (!editContent.trim()) return;
    // Edited entries must NEVER be silently reinterpreted by AI:
    // We preserve user text directly, retain existing mood/reflection unless user explicitly edits them,
    // and flag editedByUser = true.
    const updated: JournalEntry = {
      ...entry,
      userId,
      content: editContent.trim(),
      editedByUser: true,
      updatedAt: new Date().toISOString(),
    };
    upsertEntry(userId, updated);
    onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
    setEditingEntryId(null);
    showFeedback("Edited reflection saved directly. Content preserved as written without silent reinterpretation.");
  };

  const handleSaveMoodCorrection = (entry: JournalEntry) => {
    if (!correctedMoodInput.trim()) return;
    const original = entry.mood || "Reflective";
    const corrected = correctedMoodInput.trim();

    saveCorrection(userId, {
      entryId: entry.id,
      originalMood: original,
      correctedMood: corrected,
    });

    const updated: JournalEntry = {
      ...entry,
      userId,
      userMoodOverride: corrected,
      updatedAt: new Date().toISOString(),
    };

    upsertEntry(userId, updated);
    onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
    setCorrectingEntryId(null);
    setCorrectedMoodInput("");
    showFeedback(`Mood tag calibrated to "${corrected}".`);
  };

  const handleRemoveMoodTag = (entry: JournalEntry) => {
    const updated = removeMoodTag(userId, entry.id);
    if (updated) {
      onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
      setCorrectingEntryId(null);
      showFeedback("Mood tag removed from reflection.");
    }
  };

  const handleToggleDigestExclusion = (entry: JournalEntry) => {
    const nextVal = !entry.isExcludedFromDigest;
    const updated = toggleExcludeFromDigest(userId, entry.id, nextVal);
    if (updated) {
      onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
      showFeedback(
        nextVal
          ? "Entry excluded from weekly pattern analysis."
          : "Entry included in weekly pattern analysis."
      );
    }
  };

  const handleActionToggle = (entry: JournalEntry, newStatus: ActionStatus) => {
    const updated: JournalEntry = {
      ...entry,
      userId,
      actionStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };
    upsertEntry(userId, updated);
    onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
    if (newStatus === "dismissed") {
      showFeedback("Action recommendation dismissed.");
    } else if (newStatus === "completed") {
      showFeedback("Action marked complete!");
    }
  };

  const handleExportJSON = () => {
    const jsonStr = exportAllUserData(userId);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora_journal_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Full JSON archive downloaded successfully.");
  };

  const handleExportMarkdown = () => {
    const mdStr = exportMarkdownJournal(userId);
    const blob = new Blob([mdStr], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora_reflections_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Markdown reflection journal downloaded.");
  };

  const quickMoodPresets = ["Joyful", "Calm", "Reflective", "Grateful", "Anxious", "Exhausted", "Challenged", "Energized"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-display">
            Reflection Journal
          </h1>
          <p className="text-sm text-slate-400">
            Your private timeline of reflections, emotional states, and actionable next steps.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            title="Export complete JSON data archive"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            title="Export readable Markdown journal"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Markdown</span>
          </button>

          <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            {entries.length} Reflections
          </div>
        </div>
      </div>

      {/* User Control Feedback Banner */}
      {bannerMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        
        {/* Search Field */}
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords, topics, or reflections..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Mood Filter Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Moods</option>
            {allMoods.map((m, idx) => (
              <option key={idx} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Modality Filter */}
          <select
            value={selectedModality}
            onChange={(e) => setSelectedModality(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="text">Text Only</option>
            <option value="voice">Voice</option>
            <option value="multimodal">Photo + Text</option>
          </select>
        </div>

      </div>

      {/* Timeline Entries List */}
      {entries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No reflections in your private journal yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your thoughts and reflections are stored under private isolation. Start your first reflection in the Reflect Studio.
          </p>
          {onNavigateToReflect && (
            <button
              type="button"
              onClick={onNavigateToReflect}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start First Reflection</span>
            </button>
          )}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No reflections match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or filters, or write a new reflection in the Studio.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEntries.map((entry) => {
            const hasMoodTag = Boolean(entry.userMoodOverride || entry.mood);
            const displayedMood = entry.userMoodOverride || entry.mood || "Unlabeled";

            return (
              <div
                key={entry.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-sm"
              >
                
                {/* Card Top Metadata Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Modality Icon */}
                    <span className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                      {entry.source === "voice" ? (
                        <Mic className="w-3.5 h-3.5 text-teal-400" />
                      ) : entry.hasImage ? (
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>

                    {/* Date & Time */}
                    <span className="text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(entry.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {/* Edited Badge (Zero Silent Reinterpretation Guarantee) */}
                    {entry.editedByUser && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold">
                        Edited • As Written
                      </span>
                    )}

                    {/* Excluded from Patterns Badge */}
                    {entry.isExcludedFromDigest && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] flex items-center gap-1">
                        <EyeOff className="w-3 h-3 text-amber-400" />
                        <span>Excluded from Digest</span>
                      </span>
                    )}
                  </div>

                  {/* Right controls: Mood chip, Edit, Delete */}
                  <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* Mood Tag & Calibration / Removal */}
                    {correctingEntryId === entry.id ? (
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-700 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="text"
                            value={correctedMoodInput}
                            onChange={(e) => setCorrectedMoodInput(e.target.value)}
                            placeholder="Type mood tag..."
                            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveMoodCorrection(entry)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                            title="Save mood tag"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          
                          {hasMoodTag && (
                            <button
                              onClick={() => handleRemoveMoodTag(entry)}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                              title="Remove mood tag completely"
                            >
                              Remove Tag
                            </button>
                          )}

                          <button
                            onClick={() => setCorrectingEntryId(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-500">Presets:</span>
                          {quickMoodPresets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCorrectedMoodInput(preset)}
                              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {hasMoodTag ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                            {displayedMood}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 italic text-xs">
                            No Mood Tag
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setCorrectingEntryId(entry.id);
                            setCorrectedMoodInput(entry.userMoodOverride || entry.mood || "");
                          }}
                          className="p-1 text-slate-500 hover:text-slate-300"
                          title={hasMoodTag ? "Correct or remove mood tag" : "Add mood tag"}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Exclude / Include in Digest Toggle */}
                    <button
                      onClick={() => handleToggleDigestExclusion(entry)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        entry.isExcludedFromDigest
                          ? "text-amber-400 hover:bg-slate-800"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                      title={
                        entry.isExcludedFromDigest
                          ? "Excluded from Pattern Digest. Click to include."
                          : "Included in Pattern Digest. Click to exclude."
                      }
                    >
                      {entry.isExcludedFromDigest ? (
                        <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Edit entry text */}
                    {editingEntryId !== entry.id && (
                      <button
                        onClick={() => handleStartEdit(entry)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit journal text"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete reflection permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

                {/* Journal Content (Viewing or Editing) */}
                {editingEntryId === entry.id ? (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-700 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Edit Reflection Content</span>
                      </span>
                      <span className="text-[11px] text-teal-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>Saved as-is • No silent AI reinterpretation</span>
                      </span>
                    </div>

                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={5}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />

                    <p className="text-[11px] text-slate-500">
                      Per the User Control Directive, editing this text preserves your original reflection and does not trigger background re-interpretation models.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSaveEdit(entry)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition-colors"
                      >
                        Save Reflection
                      </button>
                      <button
                        onClick={() => setEditingEntryId(null)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                )}

                {/* Attached Image if present */}
                {entry.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-800 max-w-sm">
                    <img
                      src={entry.imageUrl}
                      alt="Journal attachment"
                      className="max-h-48 w-full object-cover"
                    />
                  </div>
                )}

                {/* Aurora Reflection Box */}
                {entry.reflection && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-teal-400 text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Aurora Reflection</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      &ldquo;{entry.reflection}&rdquo;
                    </p>
                  </div>
                )}

                {/* Next Step Action Box */}
                {entry.action && !entry.concern_flag && (
                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Next Step ({entry.action.effort})</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                        Status: <strong className="text-slate-200">{entry.actionStatus}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium">
                      {entry.action.action}
                    </p>

                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      {entry.actionStatus !== "completed" && entry.actionStatus !== "dismissed" && (
                        <button
                          onClick={() => handleActionToggle(entry, "completed")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Complete Action</span>
                        </button>
                      )}

                      {entry.actionStatus === "completed" && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </span>
                      )}

                      {entry.actionStatus !== "dismissed" ? (
                        <button
                          onClick={() => handleActionToggle(entry, "dismissed")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] transition-colors"
                          title="Dismiss this action suggestion"
                        >
                          Dismiss Action
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 italic">
                            Action dismissed by user
                          </span>
                          <button
                            onClick={() => handleActionToggle(entry, "pending")}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                            title="Restore action"
                          >
                            Restore
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Topic Tags Bar */}
                {entry.topics && entry.topics.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    {entry.topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-400 border border-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Explainability Accordion Toggle */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <button
                    onClick={() =>
                      setExpandedExplainId(expandedExplainId === entry.id ? null : entry.id)
                    }
                    className="hover:text-teal-300 flex items-center gap-1 transition-colors"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Explainability & Evidence details</span>
                  </button>
                  <span className="font-mono">{entry.id}</span>
                </div>

                {expandedExplainId === entry.id && (
                  <div className="p-3.5 rounded-xl bg-slate-950 text-[11px] text-slate-400 space-y-1 border border-slate-800 animate-fade-in">
                    <div>• Word count: {entry.evidenceSummary?.wordCount || entry.content.split(/\s+/).length} words</div>
                    <div>• Classification confidence: {entry.confidence ? `${Math.round(entry.confidence * 100)}%` : "N/A"}</div>
                    <div>• User override: {entry.userMoodOverride ? `Calibrated to "${entry.userMoodOverride}"` : "None"}</div>
                    <div>• Digest status: {entry.isExcludedFromDigest ? "Excluded from pattern analysis by user" : "Active in pattern digest"}</div>
                    <div>• Data isolation: Document stored under private user boundary ({userId}).</div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

