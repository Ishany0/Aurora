import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Image as ImageIcon,
  Send,
  Sparkles,
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
  Info,
  SlidersHorizontal,
  BookmarkPlus,
  RotateCcw,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { JournalEntry, MoodSignalResult, ActionItem, MoodCorrection, UserSettings } from "../types.js";
import { upsertEntry, saveCorrection } from "../lib/storage.js";
import { uploadUserPhoto, auth } from "../lib/firebase.js";
import { ExplainabilityModal } from "./ExplainabilityModal.js";

interface ReflectStudioProps {
  userId: string;
  settings: UserSettings;
  corrections: MoodCorrection[];
  onEntrySaved: (entry: JournalEntry) => void;
  onOpenSupport: () => void;
}

const INSPIRATION_PROMPTS = [
  { label: "Deadline / Academic Pressure", text: "I am feeling overwhelmed by the upcoming deadline for my..." },
  { label: "Imposter Syndrome", text: "Today during the meeting/class, I started doubting my ability to..." },
  { label: "Quiet Breakthrough", text: "I want to celebrate a quiet win that went unnoticed today..." },
  { label: "Tricky Conversation", text: "Navigating a conversation with my team/peer today felt..." },
  { label: "Energy & Mental Reset", text: "My energy has been deeply drained lately because..." },
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
  const [explainModalData, setExplainModalData] = useState<{
    title: string;
    evidence: {
      entriesCount: number;
      dateRange: string;
      repeatedTopics: string[];
      confidence: "high" | "medium" | "low" | string;
      userConfirmedCorrectionsUsed: boolean;
      isInsufficientHistory?: boolean;
      explanationSummary?: string;
    };
  } | null>(null);
  const [isOverridingMood, setIsOverridingMood] = useState(false);
  const [customMoodInput, setCustomMoodInput] = useState("");

  // Action editing state
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [customActionText, setCustomActionText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API if supported
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

    // Idempotent client-generated UUID for the entry and transaction
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const initialTimestamp = new Date().toISOString();

    // 1. Raw entry saved locally & persisted FIRST before any AI network call
    let persistentImageUrl = imagePreview || undefined;

    if (imagePreview && auth.currentUser && !auth.currentUser.isAnonymous) {
      try {
        const uploadedStorageUrl = await uploadUserPhoto(userId, imagePreview, `photo_${entryId}`);
        if (uploadedStorageUrl) {
          persistentImageUrl = uploadedStorageUrl;
        }
      } catch (storageErr) {
        console.warn("Storage upload deferred or offline, retaining local image data:", storageErr);
      }
    }

    const initialEntry: JournalEntry = {
      id: entryId,
      ownerId: userId,
      userId,
      content: content.trim(),
      rawText: content.trim(),
      imageUrl: persistentImageUrl,
      hasImage: Boolean(imagePreview),
      source: isRecording ? "voice" : imagePreview ? "multimodal" : "text",
      status: "saved",
      analysisStatus: "pending",
      actionStatus: "none",
      createdAt: initialTimestamp,
      updatedAt: initialTimestamp,
    };

    upsertEntry(userId, initialEntry);
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
          entryId,
          idempotencyKey,
          content: content.trim(),
          imageBase64: settings.allowPhotoAnalysis ? imagePreview || undefined : undefined,
          imageMime: settings.allowPhotoAnalysis ? imageMime || undefined : undefined,
          correctionsContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAnalysisStep("acting");

      // Case A: Mood & Signal failed -> save entry, mark unavailable, show documented banner
      if (data.moodStatus === "unavailable" || !data.moodResult) {
        const unavailableEntry: JournalEntry = {
          ...initialEntry,
          status: "unavailable",
          analysisStatus: "unavailable",
          updatedAt: new Date().toISOString(),
        };
        upsertEntry(userId, unavailableEntry);
        setActiveEntry(unavailableEntry);
        setErrorBanner("Your entry is safely saved. Aurora’s reflection is temporarily unavailable.");
        return;
      }

      const moodResult: MoodSignalResult = data.moodResult;

      // Case B: Mood succeeded, but Reflection failed -> preserve mood, show structured result, allow retry
      if (data.reflectionStatus === "unavailable" || !data.reflectionResult) {
        const partialEntry: JournalEntry = {
          ...initialEntry,
          mood: moodResult.mood,
          confidence: moodResult.confidence,
          topics: moodResult.topics,
          concern_flag: moodResult.concern_flag,
          emotional_valence: moodResult.emotional_valence,
          intensity: moodResult.intensity,
          reflection: undefined,
          reflectionStatus: "unavailable",
          analysisStatus: "available",
          status: "saved",
          action: null,
          actionStatus: "none",
          updatedAt: new Date().toISOString(),
          evidenceSummary: {
            wordCount: content.trim().split(/\s+/).length,
            keyThemes: moodResult.topics,
            confidenceLabel: moodResult.confidence >= 0.8 ? "high" : moodResult.confidence >= 0.6 ? "medium" : "low",
            correctedByUser: false,
          },
        };
        upsertEntry(userId, partialEntry);
        setActiveEntry(partialEntry);
        onEntrySaved(partialEntry);
        return;
      }

      // Case C: Full pipeline succeeded (Action may be present or omitted if acute)
      const reflectionText: string = data.reflectionResult.reflection;
      const actionResult: ActionItem | null = data.actionResult;

      const completedEntry: JournalEntry = {
        ...initialEntry,
        mood: moodResult.mood,
        confidence: moodResult.confidence,
        topics: moodResult.topics,
        concern_flag: moodResult.concern_flag,
        emotional_valence: moodResult.emotional_valence,
        intensity: moodResult.intensity,
        reflection: reflectionText,
        reflectionStatus: "available",
        analysisStatus: "available",
        action: actionResult,
        actionStatus: actionResult ? "pending" : "none",
        status: "analyzed",
        updatedAt: new Date().toISOString(),
        evidenceSummary: {
          wordCount: content.trim().split(/\s+/).length,
          keyThemes: moodResult.topics,
          confidenceLabel: moodResult.confidence >= 0.8 ? "high" : moodResult.confidence >= 0.6 ? "medium" : "low",
          correctedByUser: false,
        },
      };

      upsertEntry(userId, completedEntry);
      setActiveEntry(completedEntry);
      onEntrySaved(completedEntry);

      if (!moodResult.concern_flag) {
        try {
          confetti({
            particleCount: 35,
            spread: 50,
            origin: { y: 0.65 },
            colors: ["#2dd4bf", "#818cf8", "#38bdf8"],
          });
        } catch {
          // ignore confetti if restricted
        }
      }
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      const fallbackEntry: JournalEntry = {
        ...initialEntry,
        status: "unavailable",
        analysisStatus: "unavailable",
        updatedAt: new Date().toISOString(),
      };
      upsertEntry(userId, fallbackEntry);
      setActiveEntry(fallbackEntry);
      setErrorBanner("Your entry is safely saved. Aurora’s reflection is temporarily unavailable.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("idle");
    }
  };

  const handleRetryAnalysis = async (retryTarget: "all" | "reflection" = "all") => {
    if (!activeEntry || isAnalyzing) return;

    setErrorBanner(null);
    setIsAnalyzing(true);
    setAnalysisStep(retryTarget === "reflection" ? "reflecting" : "mood");

    try {
      const correctionsContext = corrections.slice(0, 5).map((c) => ({
        originalMood: c.originalMood,
        correctedMood: c.correctedMood,
      }));

      const existingMoodResult: MoodSignalResult | undefined =
        retryTarget === "reflection" && activeEntry.mood
          ? {
              mood: activeEntry.mood,
              confidence: activeEntry.confidence || 0.85,
              topics: activeEntry.topics || ["General"],
              concern_flag: Boolean(activeEntry.concern_flag),
              emotional_valence: activeEntry.emotional_valence || "reflective",
              intensity: activeEntry.intensity || "moderate",
            }
          : undefined;

      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          entryId: activeEntry.id,
          idempotencyKey: activeEntry.idempotencyKey || activeEntry.id,
          content: activeEntry.content,
          imageBase64: activeEntry.imageUrl,
          imageMime,
          correctionsContext,
          retryTarget,
          existingMoodResult,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.moodStatus === "unavailable" || !data.moodResult) {
        setErrorBanner("Your entry is safely saved. Aurora’s reflection is temporarily unavailable.");
        return;
      }

      const moodResult: MoodSignalResult = data.moodResult;
      const reflectionText = data.reflectionResult?.reflection;
      const actionResult: ActionItem | null = data.actionResult;

      const updatedEntry: JournalEntry = {
        ...activeEntry,
        mood: moodResult.mood,
        confidence: moodResult.confidence,
        topics: moodResult.topics,
        concern_flag: moodResult.concern_flag,
        emotional_valence: moodResult.emotional_valence,
        intensity: moodResult.intensity,
        reflection: reflectionText || undefined,
        reflectionStatus: reflectionText ? "available" : "unavailable",
        analysisStatus: "available",
        action: actionResult,
        actionStatus: actionResult ? "pending" : activeEntry.actionStatus || "none",
        status: reflectionText ? "analyzed" : "saved",
        updatedAt: new Date().toISOString(),
      };

      upsertEntry(userId, updatedEntry);
      setActiveEntry(updatedEntry);
      onEntrySaved(updatedEntry);
    } catch (err: any) {
      console.error("Retry failed:", err);
      setErrorBanner("Your entry is safely saved. Aurora’s reflection is temporarily unavailable.");
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
    upsertEntry(userId, updated);
    setActiveEntry(updated);
    onEntrySaved(updated);

    if (status === "completed" || status === "accepted") {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#34d399", "#a78bfa"],
        });
      } catch {
        // confetti fallback
      }
    }
  };

  const handleSaveEditedAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry || !activeEntry.action || !customActionText.trim()) return;

    const updatedAction: ActionItem = {
      ...activeEntry.action,
      action: customActionText.trim(),
    };

    const updated: JournalEntry = {
      ...activeEntry,
      action: updatedAction,
      actionStatus: "accepted",
      updatedAt: new Date().toISOString(),
    };

    upsertEntry(userId, updated);
    setActiveEntry(updated);
    onEntrySaved(updated);
    setIsEditingAction(false);
  };

  const handleApplyMoodCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry || !customMoodInput.trim()) return;

    const original = activeEntry.mood || "Reflective";
    const corrected = customMoodInput.trim();

    saveCorrection(userId, {
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

    upsertEntry(userId, updated);
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
    setIsEditingAction(false);
    setIsOverridingMood(false);
  };

  const isLowConfidence = activeEntry?.confidence !== undefined && activeEntry.confidence < 0.60;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Studio Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Private Multimodal Reflection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-display">
          What is on your mind today?
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Reflect privately using text, voice, or an optional photo. Aurora grounds your thoughts and offers one manageable next step.
        </p>
      </div>

      {/* Error / Fallback Banner */}
      {errorBanner && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between animate-fade-in" role="alert">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            {activeEntry && (
              <button
                type="button"
                onClick={() => handleRetryAnalysis("all")}
                className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors"
              >
                Try again
              </button>
            )}
            <button
              onClick={() => setErrorBanner(null)}
              className="text-amber-400 hover:text-amber-200 p-1"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
                className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 whitespace-nowrap transition-colors text-xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Primary Text Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl focus-within:border-teal-500/60 focus-within:ring-1 focus-within:ring-teal-500/30 transition-all">
            
            <label htmlFor="reflection-input" className="sr-only">
              Reflection text
            </label>
            <textarea
              id="reflection-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your reflection freely here, or tap Voice to speak without pressure..."
              rows={6}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-base leading-relaxed resize-none focus:outline-none"
              disabled={isAnalyzing}
            />

            {/* Attached Image Preview */}
            {imagePreview && (
              <div className="relative inline-block mt-3 rounded-2xl overflow-hidden border border-slate-700 shadow-md">
                <img
                  src={imagePreview}
                  alt="Reflection attachment"
                  className="max-h-44 max-w-xs object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-slate-300 hover:text-white hover:bg-rose-600 transition-colors"
                  aria-label="Remove attached photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Controls Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              
              {/* Secondary Media tools */}
              <div className="flex items-center gap-2">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isRecording
                      ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  aria-label={isRecording ? "Stop voice recording" : "Start voice dictation"}
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
                  aria-label="Attach photo"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  aria-label="Attach photo"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>{imagePreview ? "Change Photo" : "Photo"}</span>
                </button>

                {/* Word Feedback */}
                <span className="text-xs text-slate-500 hidden sm:inline ml-1">
                  {content.trim() ? content.trim().split(/\s+/).length : 0} words
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!content.trim() || isAnalyzing}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                  content.trim() && !isAnalyzing
                    ? "bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-slate-950 shadow-teal-500/20"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>
                      {analysisStep === "saving" && "Saving your reflection…"}
                      {analysisStep === "mood" && "Aurora is reflecting…"}
                      {analysisStep === "reflecting" && "Aurora is reflecting…"}
                      {analysisStep === "acting" && "Finding one next step…"}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Reflect on this</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              Your journal remains private and under your control.
            </span>
            <button
              type="button"
              onClick={onOpenSupport}
              className="text-slate-400 hover:text-slate-300 underline"
            >
              Non-clinical disclaimer
            </button>
          </div>

        </form>
      ) : (
        /* Structured AI Result Cards */
        <div className="space-y-5 animate-fade-in" aria-live="polite">
          
          {/* Card A: "Your entry is saved" Confirmation */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 shadow-sm flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Your entry is saved</span>
                <span className="text-slate-400 ml-2">
                  {new Date(activeEntry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Private isolation
                </span>
              </div>
            </div>

            <button
              onClick={handleResetStudio}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
              <span>Write Another Reflection</span>
            </button>
          </div>

          {/* Attached Photo Display if present */}
          {activeEntry.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-md">
              <div className="relative max-h-64 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                <img
                  src={activeEntry.imageUrl}
                  alt="Journal attachment"
                  className="w-full h-auto max-h-64 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="px-2 pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Multimodal photo included in reflection</span>
              </div>
            </div>
          )}

          {/* Crisis Wellbeing Banner (If concern_flag is true) */}
          {activeEntry.concern_flag && (
            <div className="p-5 rounded-2xl bg-rose-950/60 border border-rose-800/80 shadow-xl space-y-3">
              <div className="flex items-center gap-2.5 text-rose-300">
                <HeartHandshake className="w-5 h-5 text-rose-400 shrink-0" />
                <h2 className="font-bold text-sm font-display">You do not have to carry this alone</h2>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Aurora is a private personal journal, not a clinician or crisis service. If you are experiencing acute distress or thoughts of self-harm, free confidential support is always available:
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
                  View Global Crisis Lines
                </button>
              </div>
            </div>
          )}

          {/* Fallback State: Entire Analysis Unavailable */}
          {activeEntry.analysisStatus === "unavailable" && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Your entry is safely saved. Aurora’s reflection is temporarily unavailable.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetryAnalysis("all")}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>Try again</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Your entry content is safely stored in your private journal. Retrying will not create duplicate entries.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic">
                &ldquo;{activeEntry.content}&rdquo;
              </div>
            </div>
          )}

          {/* Card B: Mood Signal */}
          {activeEntry.analysisStatus !== "unavailable" && activeEntry.mood && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Mood Signal:
                  </span>
                  
                  {isOverridingMood ? (
                    <form onSubmit={handleApplyMoodCorrection} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customMoodInput}
                        onChange={(e) => setCustomMoodInput(e.target.value)}
                        placeholder="e.g. Hopeful, Fatigued"
                        className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {isLowConfidence && !activeEntry.userMoodOverride ? (
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                          Unlabeled
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold text-xs">
                          {activeEntry.userMoodOverride || activeEntry.mood}
                        </span>
                      )}
                      
                      {activeEntry.userMoodOverride && (
                        <span className="text-[10px] text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                          Calibrated by you
                        </span>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMoodInput(activeEntry.userMoodOverride || (isLowConfidence ? "" : activeEntry.mood) || "");
                          setIsOverridingMood(true);
                        }}
                        className="text-[11px] text-slate-400 hover:text-teal-300 underline flex items-center gap-1 cursor-pointer"
                        aria-label="Correct or label mood tag"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isLowConfidence && !activeEntry.userMoodOverride ? "Add a word" : "Correct tag"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Confidence state & Explainability Button */}
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-400 font-mono">
                    {isLowConfidence && !activeEntry.userMoodOverride ? (
                      <span className="text-amber-400 font-sans text-xs">
                        Not sure how to tag this one — want to add a word for it?
                      </span>
                    ) : (
                      <span>
                        Confidence: {activeEntry.confidence && activeEntry.confidence >= 0.8 ? "High" : (activeEntry.confidence || 0) >= 0.6 ? "Medium" : "Low"} ({Math.round((activeEntry.confidence || 0.85) * 100)}%)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setExplainModalData({
                        title: `Mood Signal: ${activeEntry.userMoodOverride || activeEntry.mood || "Reflective"}`,
                        evidence: {
                          entriesCount: 1,
                          dateRange: new Date(activeEntry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
                          repeatedTopics: activeEntry.topics && activeEntry.topics.length > 0 ? activeEntry.topics : ["Daily Reflection"],
                          confidence: (activeEntry.confidence || 0.85) >= 0.8 ? "high" : (activeEntry.confidence || 0.85) >= 0.6 ? "medium" : "low",
                          userConfirmedCorrectionsUsed: Boolean(activeEntry.userMoodOverride || activeEntry.evidenceSummary?.correctedByUser),
                          explanationSummary: `Grounded in 1 user-approved reflection (${activeEntry.content.split(/\s+/).length} words). Classification derived from vocabulary without exposing private thinking traces.`
                        }
                      });
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium cursor-pointer"
                    title="Why am I seeing this?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why am I seeing this?</span>
                  </button>
                </div>
              </div>

              {/* Non-medical disclaimer note */}
              <p className="text-[11px] text-slate-500">
                AI mood signals reflect wording patterns, not clinical diagnoses or objective truth.
              </p>
            </div>
          )}

          {/* Card C: "What Aurora noticed" (Topic & Grounding Chips) */}
          {activeEntry.analysisStatus !== "unavailable" && activeEntry.topics && activeEntry.topics.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                What Aurora noticed:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {activeEntry.topics.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs"
                  >
                    {t}
                  </span>
                ))}
                <span className="text-[11px] text-slate-500 pl-1">
                  • {activeEntry.content.split(/\s+/).length} words
                </span>
              </div>
            </div>
          )}

          {/* Card D: "A reflection for you" */}
          {activeEntry.analysisStatus !== "unavailable" && (
            activeEntry.reflection ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>A reflection for you</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExplainModalData({
                        title: `Empathetic Reflection Insight`,
                        evidence: {
                          entriesCount: 1,
                          dateRange: new Date(activeEntry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
                          repeatedTopics: activeEntry.topics && activeEntry.topics.length > 0 ? activeEntry.topics : ["Daily Reflection"],
                          confidence: (activeEntry.confidence || 0.85) >= 0.8 ? "high" : (activeEntry.confidence || 0.85) >= 0.6 ? "medium" : "low",
                          userConfirmedCorrectionsUsed: Boolean(activeEntry.userMoodOverride || activeEntry.evidenceSummary?.correctedByUser),
                          explanationSummary: `Synthesized directly from your single private journal entry without exposing private internal reasoning traces.`
                        }
                      });
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium cursor-pointer"
                    title="Why am I seeing this?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why am I seeing this?</span>
                  </button>
                </div>
                <p className="text-base text-slate-100 leading-relaxed font-sans">
                  {activeEntry.reflection}
                </p>
              </div>
            ) : activeEntry.reflectionStatus === "unavailable" ? (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-slate-500" />
                    <span>Reflection Momentarily Unavailable</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Your mood metadata was preserved. You can retry generating the empathetic reflection anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetryAnalysis("reflection")}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>Retry Reflection</span>
                </button>
              </div>
            ) : null
          )}

          {/* Card E: "One manageable next step" (Omitted if acute distress flagged) */}
          {activeEntry.action && !activeEntry.concern_flag && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-xl space-y-4">
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    One Manageable Next Step
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {activeEntry.action.effort}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 capitalize text-[11px]">
                    {activeEntry.action.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setExplainModalData({
                        title: `Action Recommendation: ${activeEntry.action?.action || "Next Step"}`,
                        evidence: {
                          entriesCount: 1,
                          dateRange: new Date(activeEntry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
                          repeatedTopics: activeEntry.topics && activeEntry.topics.length > 0 ? activeEntry.topics : ["Daily Reflection"],
                          confidence: (activeEntry.confidence || 0.85) >= 0.8 ? "high" : (activeEntry.confidence || 0.85) >= 0.6 ? "medium" : "low",
                          userConfirmedCorrectionsUsed: Boolean(activeEntry.userMoodOverride || activeEntry.evidenceSummary?.correctedByUser),
                          explanationSummary: `Proposed by Action Agent based on your entry's identified reflection themes. Practical step categorized under ${activeEntry.action?.category} with estimated ${activeEntry.action?.effort} effort.`
                        }
                      });
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer ml-1"
                    title="Why am I seeing this?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why am I seeing this?</span>
                  </button>
                </div>
              </div>

              {/* Action Description or Custom Edit Input */}
              {isEditingAction ? (
                <form onSubmit={handleSaveEditedAction} className="space-y-3">
                  <input
                    type="text"
                    value={customActionText}
                    onChange={(e) => setCustomActionText(e.target.value)}
                    placeholder="Customize your next step..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Save Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAction(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">
                    {activeEntry.action.action}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeEntry.action.reason}
                  </p>
                </div>
              )}

              {/* Action Controls: Save as task, Edit, Not today */}
              <div className="pt-3 flex items-center justify-between flex-wrap gap-3 border-t border-slate-800/80">
                <span className="text-xs text-slate-500">
                  Status: <strong className="text-slate-300 capitalize">{activeEntry.actionStatus}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {activeEntry.actionStatus === "pending" && !isEditingAction && (
                    <>
                      <button
                        onClick={() => handleActionStatusChange("accepted")}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Save as task</span>
                      </button>
                      <button
                        onClick={() => {
                          setCustomActionText(activeEntry.action?.action || "");
                          setIsEditingAction(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleActionStatusChange("dismissed")}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Not today
                      </button>
                    </>
                  )}

                  {activeEntry.actionStatus === "accepted" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleActionStatusChange("completed")}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Complete</span>
                      </button>
                      <button
                        onClick={() => handleActionStatusChange("dismissed")}
                        className="p-1.5 text-slate-500 hover:text-slate-400 text-xs"
                        title="Dismiss task"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {activeEntry.actionStatus === "completed" && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Completed
                    </span>
                  )}

                  {activeEntry.actionStatus === "dismissed" && (
                    <button
                      onClick={() => handleActionStatusChange("accepted")}
                      className="text-xs text-slate-400 hover:text-teal-300 underline"
                    >
                      Restore action
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Explainability Accordion ("Why am I seeing this?") */}
          <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
            <button
              onClick={() => {
                setExplainModalData({
                  title: `Reflection Analysis Evidence`,
                  evidence: {
                    entriesCount: 1,
                    dateRange: new Date(activeEntry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
                    repeatedTopics: activeEntry.topics && activeEntry.topics.length > 0 ? activeEntry.topics : ["Daily Reflection"],
                    confidence: (activeEntry.confidence || 0.85) >= 0.8 ? "high" : (activeEntry.confidence || 0.85) >= 0.6 ? "medium" : "low",
                    userConfirmedCorrectionsUsed: Boolean(activeEntry.userMoodOverride || activeEntry.evidenceSummary?.correctedByUser),
                    explanationSummary: `Grounded in your private reflection (${activeEntry.content.split(/\s+/).length} words). Zero hidden chain-of-thought traces.`
                  }
                });
              }}
              className="text-xs text-slate-400 hover:text-teal-300 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>Why am I seeing this?</span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono">
              ID: {activeEntry.id.slice(0, 16)}...
            </span>
          </div>

          {showExplainPanel && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Explainability & Grounding Evidence</span>
                </div>
                <span className="text-[10px] text-teal-300 px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 font-bold uppercase">
                  Zero Chain-of-Thought
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Approved Entries Used
                  </span>
                  <p className="text-xs text-slate-200">
                    1 approved entry ({activeEntry.evidenceSummary?.wordCount || activeEntry.content.split(/\s+/).length} words)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Date Range
                  </span>
                  <p className="text-xs text-slate-200">
                    {new Date(activeEntry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Repeated Topics
                  </span>
                  <p className="text-xs text-slate-200">
                    {activeEntry.topics?.join(", ") || "Daily reflection"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Confidence Level
                  </span>
                  <p className="text-xs text-slate-200 font-mono">
                    {(activeEntry.confidence || 0.85) >= 0.8 ? "High" : (activeEntry.confidence || 0.85) >= 0.6 ? "Medium" : "Low"} ({Math.round((activeEntry.confidence || 0.85) * 100)}%)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    User Corrections
                  </span>
                  <p className="text-xs text-slate-200">
                    {activeEntry.userMoodOverride || activeEntry.evidenceSummary?.correctedByUser
                      ? "User-confirmed mood correction used in calibration."
                      : "No user corrections applied (autonomous baseline model)."}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 border-t border-slate-900 pt-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Internal reasoning traces and prompt chains are strictly redacted to protect cognitive privacy.</span>
              </p>
            </div>
          )}

        </div>
      )}

      {/* Explainability Modal */}
      {explainModalData && (
        <ExplainabilityModal
          isOpen={true}
          onClose={() => setExplainModalData(null)}
          title={explainModalData.title}
          evidence={explainModalData.evidence}
        />
      )}

    </div>
  );
};
