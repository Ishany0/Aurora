import type { JournalEntry, MoodCorrection, UserSettings, WeeklyInsightResult } from "../types.js";
import { db, auth, handleFirestoreError, OperationType } from "./firebase.js";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";

const ENTRIES_KEY = "aurora_journal_entries_v1";
const CORRECTIONS_KEY = "aurora_mood_corrections_v1";
const SETTINGS_KEY = "aurora_user_settings_v1";
const INSIGHTS_KEY = "aurora_cached_insights_v1";

/**
 * Strips all undefined properties from an object recursively to guarantee clean payloads.
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ----------------------------------------------------------------------------
// Cloud Firestore Integration Functions
// ----------------------------------------------------------------------------

export async function syncEntryToFirestore(userId: string, entry: JournalEntry): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/entries/${entry.id}`;
  try {
    const cleanData = sanitizePayload(entry);
    await setDoc(doc(db, "users", userId, "entries", entry.id), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEntryFromFirestore(userId: string, entryId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/entries/${entryId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "entries", entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserEntries(
  userId: string,
  onEntriesReceived: (entries: JournalEntry[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }
  const collectionPath = `users/${userId}/entries`;
  try {
    const entriesRef = collection(db, "users", userId, "entries");
    const q = query(entriesRef, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const cloudEntries: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          cloudEntries.push(docSnap.data() as JournalEntry);
        });
        if (cloudEntries.length > 0) {
          saveStoredEntries(cloudEntries);
          onEntriesReceived(cloudEntries);
        }
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      }
    );
  } catch (err) {
    console.warn("Firestore subscription setup error:", err);
    return () => {};
  }
}

export async function syncCorrectionToFirestore(userId: string, correction: MoodCorrection): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/corrections/${correction.id}`;
  try {
    const clean = sanitizePayload(correction);
    await setDoc(doc(db, "users", userId, "corrections", correction.id), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSettingsToFirestore(userId: string, settings: UserSettings): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/settings/preferences`;
  try {
    const clean = sanitizePayload(settings);
    await setDoc(doc(db, "users", userId, "settings", "preferences"), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------------------------------
// Journal Entries Store
// ----------------------------------------------------------------------------

export function getStoredEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return getSeedEntries();
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading stored entries:", err);
    return getSeedEntries();
  }
}

export function saveStoredEntries(entries: JournalEntry[]): void {
  try {
    const sanitized = sanitizePayload(entries);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error("Error saving entries to localStorage:", err);
  }
}

export function upsertEntry(entry: JournalEntry): void {
  const current = getStoredEntries();
  const index = current.findIndex((e) => e.id === entry.id);
  let updated: JournalEntry[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...entry, updatedAt: new Date().toISOString() };
  } else {
    updated = [entry, ...current];
  }

  saveStoredEntries(updated);

  // Synchronize to Firestore asynchronously if user is authenticated
  if (entry.userId && auth.currentUser && auth.currentUser.uid === entry.userId) {
    syncEntryToFirestore(entry.userId, index >= 0 ? updated[index] : entry).catch((e) => {
      console.warn("Firestore background sync notice:", e);
    });
  }
}

export function deleteEntry(entryId: string, userId?: string): void {
  const current = getStoredEntries();
  const updated = current.filter((e) => e.id !== entryId);
  saveStoredEntries(updated);

  if (userId && auth.currentUser && auth.currentUser.uid === userId) {
    deleteEntryFromFirestore(userId, entryId).catch((e) => {
      console.warn("Firestore delete notice:", e);
    });
  }
}

// ----------------------------------------------------------------------------
// Mood Calibration Memory
// ----------------------------------------------------------------------------

export function getStoredCorrections(): MoodCorrection[] {
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCorrection(correction: Omit<MoodCorrection, "id" | "createdAt">): MoodCorrection {
  const current = getStoredCorrections();
  const newRecord: MoodCorrection = {
    id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: correction.userId,
    entryId: correction.entryId,
    originalMood: correction.originalMood,
    correctedMood: correction.correctedMood,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...current].slice(0, 10); // Keep last 10 for few-shot context
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(sanitizePayload(updated)));
  return newRecord;
}

// ----------------------------------------------------------------------------
// User Settings & Stats
// ----------------------------------------------------------------------------

export function getStoredSettings(userId = "user_default"): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback below
  }

  return {
    userId,
    petName: "Lumi",
    enablePhotoAnalysis: true,
    enableWeeklyPatterns: true,
    streakDays: 3,
    completedActionsCount: 4,
    updatedAt: new Date().toISOString(),
  };
}

export function saveStoredSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitizePayload(settings)));
}

// ----------------------------------------------------------------------------
// Cached Weekly Insights
// ----------------------------------------------------------------------------

export function getCachedInsights(): WeeklyInsightResult | null {
  try {
    const raw = localStorage.getItem(INSIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedInsights(insight: WeeklyInsightResult): void {
  localStorage.setItem(INSIGHTS_KEY, JSON.stringify(sanitizePayload(insight)));
}

// ----------------------------------------------------------------------------
// Data Export & Full Wipe
// ----------------------------------------------------------------------------

export function exportAllUserData(): string {
  const data = {
    exportedAt: new Date().toISOString(),
    userSettings: getStoredSettings(),
    entries: getStoredEntries(),
    corrections: getStoredCorrections(),
    privacyNotice: "Aurora exports contain strictly your own private entries and metadata.",
  };
  return JSON.stringify(data, null, 2);
}

export function exportMarkdownJournal(): string {
  const entries = getStoredEntries();
  let md = `# Aurora Private Journal Export\nExported: ${new Date().toLocaleDateString()}\n\n---\n\n`;

  entries.forEach((e) => {
    md += `## Reflection — ${new Date(e.createdAt).toLocaleString()}\n`;
    md += `**Mood:** ${e.userMoodOverride || e.mood || "Reflective"} (Valence: ${e.emotional_valence || "neutral"})\n`;
    md += `**Topics:** ${e.topics?.join(", ") || "General"}\n`;
    md += `**Input Modality:** ${e.source}\n\n`;
    md += `### Journal Text\n${e.content}\n\n`;
    if (e.reflection) {
      md += `### Aurora Reflection\n> ${e.reflection}\n\n`;
    }
    if (e.action) {
      md += `### Next Step (${e.actionStatus})\n- **Action:** ${e.action.action}\n- **Effort:** ${e.action.effort}\n- **Reason:** ${e.action.reason}\n\n`;
    }
    md += `---\n\n`;
  });

  return md;
}

export function wipeAllUserData(): void {
  localStorage.removeItem(ENTRIES_KEY);
  localStorage.removeItem(CORRECTIONS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(INSIGHTS_KEY);
}

// ----------------------------------------------------------------------------
// Realistic Demo Seed Data
// ----------------------------------------------------------------------------

function getSeedEntries(): JournalEntry[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      id: "seed_01",
      userId: "user_default",
      content:
        "Just wrapped up the first sprint demo of our capstone project. My code ran without bugs, but when questions started coming from the review panel, I froze up and felt imposter syndrome creeping in. Everyone else seemed so articulate.",
      hasImage: false,
      source: "text",
      mood: "Anxious",
      confidence: 0.88,
      topics: ["Capstone Demo", "Imposter Syndrome", "Public Speaking"],
      concern_flag: false,
      emotional_valence: "challenging",
      intensity: "moderate",
      reflection:
        "Presenting technical work under immediate questioning is a distinct skill from building the code itself. Your demo succeeded because of your preparation; momentary hesitation during spontaneous Q&A does not diminish your technical capability.",
      action: {
        action: "Jot down the top 3 questions asked today and draft a 2-sentence bullet for each while fresh",
        reason: "Documenting answers now turns surprising questions into familiar territory for next time.",
        effort: "15 minutes",
        category: "planning",
        requires_confirmation: true,
      },
      actionStatus: "accepted",
      status: "analyzed",
      createdAt: new Date(now - 2 * day).toISOString(),
      updatedAt: new Date(now - 2 * day).toISOString(),
      evidenceSummary: {
        wordCount: 42,
        keyThemes: ["Capstone Demo", "Imposter Syndrome"],
        confidenceLabel: "high",
        correctedByUser: false,
      },
    },
    {
      id: "seed_02",
      userId: "user_default",
      content:
        "Took an early morning walk through the park before starting study hours. The air was crisp, and for the first time in two weeks my mind felt spacious and quiet. Grateful for the change of pace.",
      hasImage: false,
      source: "voice",
      mood: "Peaceful",
      confidence: 0.92,
      topics: ["Morning Walk", "Mental Space", "Gratitude"],
      concern_flag: false,
      emotional_valence: "positive",
      intensity: "low",
      reflection:
        "Creating deliberate stillness before the rush of commitments grounds your entire day. Savoring this quiet clarity reinforces how vital gentle pauses are for your focus.",
      action: {
        action: "Set a recurring calendar block for an 8:00 AM outdoor pause tomorrow",
        reason: "Protects morning breathing room before digital notifications take over.",
        effort: "5 minutes",
        category: "organization",
        requires_confirmation: true,
      },
      actionStatus: "completed",
      status: "analyzed",
      createdAt: new Date(now - 1 * day).toISOString(),
      updatedAt: new Date(now - 1 * day).toISOString(),
      evidenceSummary: {
        wordCount: 38,
        keyThemes: ["Morning Walk", "Mental Space"],
        confidenceLabel: "high",
        correctedByUser: false,
      },
    },
    {
      id: "seed_03",
      userId: "user_default",
      content:
        "Had a difficult conversation with my project partner about dividing up the remaining test coverage. It felt awkward at first, but we set honest boundaries and agreed on a clean split.",
      hasImage: false,
      source: "text",
      mood: "Relieved",
      confidence: 0.84,
      topics: ["Team Boundaries", "Test Coverage", "Communication"],
      concern_flag: false,
      emotional_valence: "positive",
      intensity: "moderate",
      reflection:
        "Navigating uncomfortable communication directly takes courage and maturity. Reaching an authentic alignment now prevents accumulated friction later in the semester.",
      action: {
        action: "Post the agreed test file ownership list in our shared repo issues",
        reason: "Solidifies mutual understanding and prevents duplicate effort.",
        effort: "5 minutes",
        category: "communication",
        requires_confirmation: true,
      },
      actionStatus: "completed",
      status: "analyzed",
      createdAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      evidenceSummary: {
        wordCount: 34,
        keyThemes: ["Team Boundaries", "Communication"],
        confidenceLabel: "high",
        correctedByUser: false,
      },
    },
  ];
}
