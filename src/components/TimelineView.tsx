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
} from "lucide-react";
import type { JournalEntry } from "../types.js";
import { upsertEntry, deleteEntry, saveCorrection } from "../lib/storage.js";

interface TimelineViewProps {
  entries: JournalEntry[];
  userId: string;
  onEntriesChange: (updated: JournalEntry[]) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  userId,
  onEntriesChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [selectedModality, setSelectedModality] = useState<string>("all");
  
  // Editing entry state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  // Mood correction state
  const [correctingEntryId, setCorrectingEntryId] = useState<string | null>(null);
  const [correctedMoodInput, setCorrectedMoodInput] = useState("");

  // Explainability expand state
  const [expandedExplainId, setExpandedExplainId] = useState<string | null>(null);

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

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this private reflection?")) {
      deleteEntry(id);
      onEntriesChange(entries.filter((e) => e.id !== id));
    }
  };

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setEditContent(entry.content);
  };

  const handleSaveEdit = (entry: JournalEntry) => {
    if (!editContent.trim()) return;
    const updated: JournalEntry = {
      ...entry,
      content: editContent.trim(),
      updatedAt: new Date().toISOString(),
    };
    upsertEntry(updated);
    onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
    setEditingEntryId(null);
  };

  const handleSaveMoodCorrection = (entry: JournalEntry) => {
    if (!correctedMoodInput.trim()) return;
    const original = entry.mood || "Reflective";
    const corrected = correctedMoodInput.trim();

    saveCorrection({
      userId,
      entryId: entry.id,
      originalMood: original,
      correctedMood: corrected,
    });

    const updated: JournalEntry = {
      ...entry,
      userMoodOverride: corrected,
      updatedAt: new Date().toISOString(),
    };

    upsertEntry(updated);
    onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
    setCorrectingEntryId(null);
    setCorrectedMoodInput("");
  };

  const handleActionToggle = (entry: JournalEntry, newStatus: "accepted" | "completed" | "dismissed") => {
    const updated: JournalEntry = {
      ...entry,
      actionStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };
    upsertEntry(updated);
    onEntriesChange(entries.map((e) => (e.id === entry.id ? updated : e)));
  };

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
        <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl self-start">
          {entries.length} Total Reflections
        </div>
      </div>

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
      {filteredEntries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No reflections match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or filters, or write a new reflection in the Studio.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-sm"
            >
              
              {/* Card Top Metadata Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                
                <div className="flex items-center gap-2">
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
                </div>

                {/* Right controls: Mood chip, Edit, Delete */}
                <div className="flex items-center gap-2">
                  
                  {/* Mood Tag & Calibration */}
                  {correctingEntryId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={correctedMoodInput}
                        onChange={(e) => setCorrectedMoodInput(e.target.value)}
                        placeholder="New mood tag"
                        className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveMoodCorrection(entry)}
                        className="p-1 text-teal-400 hover:text-teal-300"
                        title="Save correction"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCorrectingEntryId(null)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                        {entry.userMoodOverride || entry.mood || "Reflective"}
                      </span>
                      <button
                        onClick={() => {
                          setCorrectingEntryId(entry.id);
                          setCorrectedMoodInput(entry.userMoodOverride || entry.mood || "");
                        }}
                        className="p-1 text-slate-500 hover:text-slate-300"
                        title="Correct mood tag"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

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
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveEdit(entry)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingEntryId(null)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-400"
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

                  <div className="pt-1 flex items-center gap-2">
                    {entry.actionStatus !== "completed" ? (
                      <button
                        onClick={() => handleActionToggle(entry, "completed")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Complete Action</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </span>
                    )}

                    {entry.actionStatus === "pending" && (
                      <button
                        onClick={() => handleActionToggle(entry, "dismissed")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-[11px]"
                      >
                        Dismiss
                      </button>
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
                <div className="p-3.5 rounded-xl bg-slate-950 text-[11px] text-slate-400 space-y-1 border border-slate-800">
                  <div>• Word count: {entry.evidenceSummary?.wordCount || entry.content.split(/\s+/).length} words</div>
                  <div>• Classification confidence: {Math.round((entry.confidence || 0.85) * 100)}%</div>
                  <div>• User override: {entry.userMoodOverride ? `Calibrated to "${entry.userMoodOverride}"` : "None"}</div>
                  <div>• Data isolation: Document stored under private user boundary.</div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
