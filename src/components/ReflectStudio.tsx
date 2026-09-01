import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Image as ImageIcon,
  Send,
  Sparkles,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Tag,
  AlertTriangle,
  HeartHandshake,
  Check,
  Edit3,
  X,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { JournalEntry, MoodSignalResult, ActionItem, MoodCorrection, UserSettings } from "../types.js";
import { upsertEntry, saveCorrection } from "../lib/storage.js";

interface ReflectStudioProps {
  userId: string;
  settings: UserSettings;
  corrections: MoodCorrection[];
  onEntrySaved: (entry: JournalEntry) => void;
  onOpenSupport: () => void;
}

const INSPIRATION_PROMPTS = [
  { label: "Academic / Deadline Pressure", text: "I am feeling overwhelmed by the upcoming deadline for my..." },
  { label: "Imposter Syndrome", text: "Today during the meeting/class, I started doubting my ability to..." },
  { label: "Quiet Breakthrough", text: "I want to celebrate a quiet win that went unnoticed today..." },
  { label: "Boundary Conversation", text: "Navigating a tricky conversation with my team/peer today felt..." },
  { label: "Fatigue & Mental Reset", text: "My energy has been deeply drained lately because..." },
];

export const ReflectStudio: React.FC<ReflectStudioProps> = ({
  userId,
  settings,
  corrections,
  onEntrySaved,
  onOpenSupport,
}) => {
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  
  // Pipeline state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<"idle" | "saving" | "mood" | "reflecting" | "acting">("idle");
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Explainability & Correction state
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [isOverridingMood, setIsOverridingMood] = useState(false);
  const [customMoodInput, setCustomMoodInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API if supported in the browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      setErrorBanner("Browser voice transcription is not supported in this browser. Please type your reflection.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setErrorBanner(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start voice recognition:", err);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorBanner("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorBanner("Image size exceeds 5MB. Please upload a smaller photo.");
      return;
    }

    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setErrorBanner(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageMime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    setContent(promptText);
  };

  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isAnalyzing) return;

    setErrorBanner(null);
    setIsAnalyzing(true);
    setAnalysisStep("saving");

    // Idempotent client-generated UUID for the entry
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const initialTimestamp = new Date().toISOString();

    // 1. Raw entry saved locally FIRST (Failure-Resilient Workflow)
    const initialEntry: JournalEntry = {
      id: entryId,
      userId,
      content: content.trim(),
      imageUrl: imagePreview || undefined,
      hasImage: Boolean(imagePreview),
      source: isRecording ? "voice" : imagePreview ? "multimodal" : "text",
      status: "saved",
      actionStatus: "none",
      createdAt: initialTimestamp,
      updatedAt: initialTimestamp,
    };

    upsertEntry(initialEntry);
    setActiveEntry(initialEntry);

    try {
      setAnalysisStep("mood");

      // Relevant corrections context for few-shot adaptation
      const correctionsContext = corrections.slice(0, 5).map((c) => ({
        originalMood: c.originalMood,
        correctedMood: c.correctedMood,
      }));

      setAnalysisStep("reflecting");

      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          content: content.trim(),
          imageBase64: imagePreview || undefined,
          imageMime: imageMime || undefined,
          correctionsContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const moodResult: MoodSignalResult = data.moodResult;
      const reflectionText: string = data.reflectionResult?.reflection || "";
      const actionResult: ActionItem | null = data.actionResult;

      setAnalysisStep("acting");

      const completedEntry: JournalEntry = {
        ...initialEntry,
        mood: moodResult.mood,
        confidence: moodResult.confidence,
        topics: moodResult.topics,
        concern_flag: moodResult.concern_flag,
        emotional_valence: moodResult.emotional_valence,
        intensity: moodResult.intensity,
        reflection: reflectionText,
        action: actionResult,
        actionStatus: actionResult ? "pending" : "none",
        status: "analyzed",
        updatedAt: new Date().toISOString(),
        evidenceSummary: {
          wordCount: content.trim().split(/\s+/).length,
          keyThemes: moodResult.topics,
          confidenceLabel: moodResult.confidence >= 0.8 ? "high" : moodResult.confidence >= 0.5 ? "medium" : "low",
          correctedByUser: false,
        },
      };

      upsertEntry(completedEntry);
      setActiveEntry(completedEntry);
      onEntrySaved(completedEntry);

      if (!moodResult.concern_flag) {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
            colors: ["#2dd4bf", "#818cf8", "#fbbf24"],
          });
        } catch {
          // ignore confetti on restricted environments
        }
      }
    } catch (err: any) {
      console.error("AI Analysis encountered error:", err);
      // Gracefully persist entry as saved with fallback notification
      const fallbackEntry: JournalEntry = {
        ...initialEntry,
        status: "failed",
        reflection: "Your reflection was safely saved. AI analysis is momentarily resting.",
      };
      upsertEntry(fallbackEntry);
      setActiveEntry(fallbackEntry);
      setErrorBanner("Your reflection was saved to your private journal. Analysis is temporarily unavailable.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("idle");
    }
  };

  const handleActionStatusChange = (status: "accepted" | "completed" | "dismissed") => {
    if (!activeEntry) return;
    const updated: JournalEntry = {
      ...activeEntry,
      actionStatus: status,
      updatedAt: new Date().toISOString(),
    };
    upsertEntry(updated);
    setActiveEntry(updated);
    onEntrySaved(updated);

    if (status === "completed" || status === "accepted") {
      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#34d399", "#a78bfa"],
        });
      } catch {
        // confetti fallback
      }
    }
  };

  const handleApplyMoodCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry || !customMoodInput.trim()) return;

    const original = activeEntry.mood || "Reflective";
    const corrected = customMoodInput.trim();

    saveCorrection({
      userId,
      entryId: activeEntry.id,
      originalMood: original,
      correctedMood: corrected,
    });

    const updated: JournalEntry = {
      ...activeEntry,
      userMoodOverride: corrected,
      evidenceSummary: activeEntry.evidenceSummary
        ? { ...activeEntry.evidenceSummary, correctedByUser: true }
        : undefined,
      updatedAt: new Date().toISOString(),
    };

    upsertEntry(updated);
    setActiveEntry(updated);
    onEntrySaved(updated);
    setIsOverridingMood(false);
    setCustomMoodInput("");
  };

  const handleResetStudio = () => {
    setContent("");
    setImagePreview(null);
    setImageMime(null);
    setActiveEntry(null);
    setShowExplainPanel(false);
    setErrorBanner(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Studio Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Reflection Studio</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight font-display">
          What is on your mind today?
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Reflect privately using text, voice, or a photo. Aurora provides non-clinical empathetic perspectives and one manageable next step.
        </p>
      </div>

      {/* Error / Fallback Banner */}
      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Studio Input Area */}
      {!activeEntry || activeEntry.status === "failed" ? (
        <form onSubmit={handleSubmitReflection} className="space-y-4">
          
          {/* Inspiration Prompt Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-slate-500 text-[11px] uppercase font-semibold shrink-0">Prompts:</span>
            {INSPIRATION_PROMPTS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectPrompt(p.text)}
                className="px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 whitespace-nowrap transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Text Area Card */}
          <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-xl focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your honest reflection here, or tap the microphone to speak freely..."
              rows={5}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-base leading-relaxed resize-none focus:outline-none"
              disabled={isAnalyzing}
            />

            {/* Attached Image Preview */}
            {imagePreview && (
              <div className="relative inline-block mt-3 rounded-xl overflow-hidden border border-slate-700 shadow-md">
                <img
                  src={imagePreview}
                  alt="Reflection attachment"
                  className="max-h-40 max-w-xs object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/80 text-slate-300 hover:text-white hover:bg-rose-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Controls Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              
              {/* Media tools */}
              <div className="flex items-center gap-2">
                {/* Voice Input Toggle */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isRecording
                      ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  title="Speak your reflection"
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-teal-400" />}
                  <span>{isRecording ? "Listening..." : "Voice"}</span>
                </button>

                {/* Photo Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  title="Attach an optional photo"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{imagePreview ? "Change Photo" : "Photo"}</span>
                </button>

                {/* Word Counter */}
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {content.trim() ? content.trim().split(/\s+/).length : 0} words
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!content.trim() || isAnalyzing}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
                  content.trim() && !isAnalyzing
                    ? "bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white shadow-indigo-500/20 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                    <span>
                      {analysisStep === "saving" && "Saving Entry..."}
                      {analysisStep === "mood" && "Tagging Mood..."}
                      {analysisStep === "reflecting" && "Synthesizing..."}
                      {analysisStep === "acting" && "Planning Next Step..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Reflect</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              Entries are saved privately to your owner-isolated space.
            </span>
            <button
              type="button"
              onClick={onOpenSupport}
              className="text-slate-400 hover:text-slate-300 underline"
            >
              Non-clinical safety disclaimer
            </button>
          </div>

        </form>
      ) : (
        /* Reflection Results View */
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Control: New Reflection Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Reflection Generated</span>
            </div>
            <button
              onClick={handleResetStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
              <span>Write Another Reflection</span>
            </button>
          </div>

          {/* Crisis Support Banner (If concern_flag is true) */}
          {activeEntry.concern_flag && (
            <div className="p-5 rounded-2xl bg-rose-950/60 border border-rose-800/80 shadow-xl space-y-3">
              <div className="flex items-center gap-2.5 text-rose-300">
                <HeartHandshake className="w-5 h-5 text-rose-400 shrink-0" />
                <h4 className="font-bold text-sm font-display">You do not have to carry this alone</h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Aurora is a private journal, not a clinician or crisis service. If you are going through a heavy moment or thinking of self-harm, please reach out to free, caring 24/7 counselors:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="tel:988"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                >
                  Call / Text 988 (Lifeline)
                </a>
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700"
                >
                  View Global Crisis Options
                </button>
              </div>
            </div>
          )}

          {/* Mood & Signal Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Detected Mood:</span>
                
                {isOverridingMood ? (
                  <form onSubmit={handleApplyMoodCorrection} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customMoodInput}
                      onChange={(e) => setCustomMoodInput(e.target.value)}
                      placeholder="e.g. Hopeful, Exhausted"
                      className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOverridingMood(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                      {activeEntry.userMoodOverride || activeEntry.mood || "Reflective"}
                    </span>
                    {activeEntry.userMoodOverride && (
                      <span className="text-[10px] text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                        User Calibrated
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMoodInput(activeEntry.userMoodOverride || activeEntry.mood || "");
                        setIsOverridingMood(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-indigo-300 underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Correct tag</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Confidence badge */}
              {activeEntry.confidence !== undefined && (
                <span className="text-xs text-slate-400 font-mono">
                  Confidence: {Math.round(activeEntry.confidence * 100)}%
                </span>
              )}
            </div>

            {/* Topic Chips */}
            {activeEntry.topics && activeEntry.topics.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {activeEntry.topics.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[11px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reflection Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Aurora Reflection</span>
            </div>
            <p className="text-base text-slate-100 leading-relaxed italic">
              &ldquo;{activeEntry.reflection}&rdquo;
            </p>
          </div>

          {/* Action Step Card (Omitted if acute crisis flagged) */}
          {activeEntry.action && !activeEntry.concern_flag && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/20 shadow-xl space-y-4">
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    One Manageable Next Step
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {activeEntry.action.effort}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 capitalize text-[11px]">
                    {activeEntry.action.category}
                  </span>
                </div>
              </div>

              {/* Action Description */}
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  {activeEntry.action.action}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeEntry.action.reason}
                </p>
              </div>

              {/* Action Controls */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-slate-800">
                <span className="text-xs text-slate-500">Status: <strong className="text-slate-300 capitalize">{activeEntry.actionStatus}</strong></span>

                <div className="flex items-center gap-2">
                  {activeEntry.actionStatus === "pending" && (
                    <>
                      <button
                        onClick={() => handleActionStatusChange("accepted")}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Step</span>
                      </button>
                      <button
                        onClick={() => handleActionStatusChange("dismissed")}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                      >
                        Dismiss
                      </button>
                    </>
                  )}

                  {activeEntry.actionStatus === "accepted" && (
                    <button
                      onClick={() => handleActionStatusChange("completed")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  {activeEntry.actionStatus === "completed" && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Completed
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Explainability Bar ("Why am I seeing this?") */}
          <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
            <button
              onClick={() => setShowExplainPanel(!showExplainPanel)}
              className="text-xs text-slate-400 hover:text-teal-300 flex items-center gap-1.5 font-medium transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>Why am I seeing this? (Explainability & Evidence)</span>
            </button>

            <span className="text-[11px] text-slate-500">
              Idempotent ID: {activeEntry.id.slice(0, 16)}...
            </span>
          </div>

          {/* Explainability Accordion */}
          {showExplainPanel && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>Evidence & Agent Logic Breakdown</span>
              </div>
              
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li>
                  <strong className="text-slate-300">Evidence Base:</strong> Evaluated your {activeEntry.evidenceSummary?.wordCount || 0}-word {activeEntry.source} entry.
                </li>
                <li>
                  <strong className="text-slate-300">Topics Extracted:</strong> {activeEntry.topics?.join(", ") || "General reflection"}.
                </li>
                <li>
                  <strong className="text-slate-300">Confidence Rating:</strong> {activeEntry.evidenceSummary?.confidenceLabel || "High"} ({Math.round((activeEntry.confidence || 0.85) * 100)}%).
                </li>
                {activeEntry.evidenceSummary?.correctedByUser && (
                  <li>
                    <strong className="text-slate-300">User Calibration:</strong> User-corrected mood applied to calibration memory.
                  </li>
                )}
                <li>
                  <strong className="text-slate-300">Non-Clinical Boundary:</strong> All reflections remain non-clinical and non-diagnostic.
                </li>
              </ul>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
