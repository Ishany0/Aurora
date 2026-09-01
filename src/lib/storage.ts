import type { JournalEntry, MoodCorrection, UserSettings, WeeklyInsightResult } from "../types.js";
import { db, auth, handleFirestoreError, OperationType } from "./firebase.js";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

/**
 * Strips all undefined properties from an object recursively to guarantee clean payloads.
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// User-scoped LocalStorage Key Helpers
function getEntriesKey(userId: string): string {
  return `aurora_entries_${userId}`;
}

function getCorrectionsKey(userId: string): string {
  return `aurora_corrections_${userId}`;
}

function getSettingsKey(userId: string): string {
  return `aurora_settings_${userId}`;
}

function getInsightsKey(userId: string): string {
  return `aurora_cached_insights_${userId}`;
}

// ----------------------------------------------------------------------------
// Cloud Firestore Integration Functions (Owner-Isolated)
// ----------------------------------------------------------------------------

export async function syncEntryToFirestore(userId: string, entry: JournalEntry): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId || entry.userId !== userId) return;
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
  if (!auth.currentUser || auth.currentUser.uid !== userId || !userId) {
    onEntriesReceived([]);
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
          const data = docSnap.data() as JournalEntry;
          // Validate ownership before storing or rendering
          if (data && data.userId === userId) {
            cloudEntries.push(data);
          }
        });

        // Always update the authenticated user's scoped cache
        saveStoredEntries(userId, cloudEntries);
        // CRITICAL: Always deliver the accurate query result, even if empty array []
        onEntriesReceived(cloudEntries);
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
  if (!auth.currentUser || auth.currentUser.uid !== userId || correction.userId !== userId) return;
  const path = `users/${userId}/corrections/${correction.id}`;
  try {
    const clean = sanitizePayload(correction);
    await setDoc(doc(db, "users", userId, "corrections", correction.id), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSettingsToFirestore(userId: string, settings: UserSettings): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId || settings.userId !== userId) return;
  const path = `users/${userId}/settings/preferences`;
  try {
    const clean = sanitizePayload(settings);
    await setDoc(doc(db, "users", userId, "settings", "preferences"), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------------------------------
// User-Isolated Journal Entries Store
// ----------------------------------------------------------------------------

export function getStoredEntries(userId: string): JournalEntry[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getEntriesKey(userId));
    if (!raw) return [];
    const parsed: JournalEntry[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e.userId === userId) : [];
  } catch (err) {
    console.error("Error reading stored entries for user:", err);
    return [];
  }
}

export function saveStoredEntries(userId: string, entries: JournalEntry[]): void {
  if (!userId) return;
  try {
    const userOnlyEntries = entries.filter((e) => e.userId === userId);
    const sanitized = sanitizePayload(userOnlyEntries);
    localStorage.setItem(getEntriesKey(userId), JSON.stringify(sanitized));
  } catch (err) {
    console.error("Error saving entries to localStorage:", err);
  }
}

export function upsertEntry(userId: string, entry: JournalEntry): void {
  if (!userId || entry.userId !== userId) return;

  const current = getStoredEntries(userId);
  const index = current.findIndex((e) => e.id === entry.id);
  let updated: JournalEntry[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...entry, userId, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...entry, userId }, ...current];
  }

  saveStoredEntries(userId, updated);

  // Synchronize to Firestore if user is authenticated
  if (auth.currentUser && auth.currentUser.uid === userId) {
    const targetEntry = index >= 0 ? updated[index] : { ...entry, userId };
    syncEntryToFirestore(userId, targetEntry).catch((e) => {
      console.warn("Firestore background sync notice:", e);
    });
  }
}

export function deleteEntry(userId: string, entryId: string): void {
  if (!userId) return;

  const current = getStoredEntries(userId);
  const updated = current.filter((e) => e.id !== entryId);
  saveStoredEntries(userId, updated);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    deleteEntryFromFirestore(userId, entryId).catch((e) => {
      console.warn("Firestore delete notice:", e);
    });
  }
}

export function removeMoodTag(userId: string, entryId: string): JournalEntry | null {
  if (!userId) return null;

  const current = getStoredEntries(userId);
  const entryIndex = current.findIndex((e) => e.id === entryId);
  if (entryIndex === -1) return null;

  const target = current[entryIndex];
  const updated: JournalEntry = {
    ...target,
    mood: undefined,
    userMoodOverride: undefined,
    confidence: undefined,
    updatedAt: new Date().toISOString(),
  };

  current[entryIndex] = updated;
  saveStoredEntries(userId, current);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    syncEntryToFirestore(userId, updated).catch((e) => {
      console.warn("Firestore mood tag remove notice:", e);
    });
  }

  return updated;
}

export function toggleExcludeFromDigest(
  userId: string,
  entryId: string,
  isExcluded: boolean
): JournalEntry | null {
  if (!userId) return null;

  const current = getStoredEntries(userId);
  const entryIndex = current.findIndex((e) => e.id === entryId);
  if (entryIndex === -1) return null;

  const target = current[entryIndex];
  const updated: JournalEntry = {
    ...target,
    isExcludedFromDigest: isExcluded,
    updatedAt: new Date().toISOString(),
  };

  current[entryIndex] = updated;
  saveStoredEntries(userId, current);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    syncEntryToFirestore(userId, updated).catch((e) => {
      console.warn("Firestore exclude toggle notice:", e);
    });
  }

  return updated;
}

// ----------------------------------------------------------------------------
// User-Isolated Mood Calibration Memory
// ----------------------------------------------------------------------------

export function getStoredCorrections(userId: string): MoodCorrection[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getCorrectionsKey(userId));
    if (!raw) return [];
    const parsed: MoodCorrection[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => c.userId === userId) : [];
  } catch {
    return [];
  }
}

export function saveCorrection(userId: string, correction: Omit<MoodCorrection, "id" | "createdAt" | "userId">): MoodCorrection {
  const current = getStoredCorrections(userId);
  const newRecord: MoodCorrection = {
    id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    entryId: correction.entryId,
    originalMood: correction.originalMood,
    correctedMood: correction.correctedMood,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...current].slice(0, 10); // Keep last 10 for few-shot context
  if (userId) {
    localStorage.setItem(getCorrectionsKey(userId), JSON.stringify(sanitizePayload(updated)));
    if (auth.currentUser && auth.currentUser.uid === userId) {
      syncCorrectionToFirestore(userId, newRecord).catch(() => {});
    }
  }
  return newRecord;
}

// ----------------------------------------------------------------------------
// User-Isolated Settings & Stats
// ----------------------------------------------------------------------------

export function getStoredSettings(userId: string): UserSettings {
  const defaultSettings: UserSettings = {
    userId: userId || "",
    petName: "Lumi",
    enablePhotoAnalysis: true,
    enableWeeklyPatterns: true,
    streakDays: 0,
    completedActionsCount: 0,
    updatedAt: new Date().toISOString(),
  };

  if (!userId) return defaultSettings;

  try {
    const raw = localStorage.getItem(getSettingsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed, userId };
    }
  } catch {
    // fallback
  }

  return defaultSettings;
}

export function saveStoredSettings(userId: string, settings: UserSettings): void {
  if (!userId) return;
  const sanitized = sanitizePayload({ ...settings, userId });
  localStorage.setItem(getSettingsKey(userId), JSON.stringify(sanitized));

  if (auth.currentUser && auth.currentUser.uid === userId) {
    syncSettingsToFirestore(userId, sanitized).catch((e) => {
      console.warn("Firestore settings sync notice:", e);
    });
  }
}

// ----------------------------------------------------------------------------
// User-Isolated Cached Weekly Insights
// ----------------------------------------------------------------------------

export function getCachedInsights(userId: string): WeeklyInsightResult | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getInsightsKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedInsights(userId: string, insight: WeeklyInsightResult): void {
  if (!userId) return;
  localStorage.setItem(getInsightsKey(userId), JSON.stringify(sanitizePayload(insight)));
}

// ----------------------------------------------------------------------------
// Data Export & User Data Wipe
// ----------------------------------------------------------------------------

export function exportAllUserData(userId: string): string {
  const data = {
    userId,
    exportedAt: new Date().toISOString(),
    userSettings: getStoredSettings(userId),
    entries: getStoredEntries(userId),
    corrections: getStoredCorrections(userId),
    privacyNotice: "Aurora exports contain strictly your own private entries and metadata.",
  };
  return JSON.stringify(data, null, 2);
}

export function exportMarkdownJournal(userId: string): string {
  const entries = getStoredEntries(userId);
  let md = `# Aurora Private Journal Export\nUserId: ${userId}\nExported: ${new Date().toLocaleDateString()}\n\n---\n\n`;

  if (entries.length === 0) {
    md += `*No journal entries recorded for this account.*\n`;
    return md;
  }

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

export function wipeAllUserData(userId?: string): void {
  if (userId) {
    localStorage.removeItem(getEntriesKey(userId));
    localStorage.removeItem(getCorrectionsKey(userId));
    localStorage.removeItem(getSettingsKey(userId));
    localStorage.removeItem(getInsightsKey(userId));
  }
  // Clear any legacy shared keys if they exist in browser
  localStorage.removeItem("aurora_journal_entries_v1");
  localStorage.removeItem("aurora_mood_corrections_v1");
  localStorage.removeItem("aurora_user_settings_v1");
  localStorage.removeItem("aurora_cached_insights_v1");
}

export async function permanentlyDeleteUserAccountAndData(userId: string): Promise<void> {
  // 1. Wipe local persistence for this user
  wipeAllUserData(userId);

  // 2. If authenticated in Firebase, attempt Firestore document cleanup
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const entriesRef = collection(db, "users", userId, "entries");
      const snap = await getDocs(entriesRef);
      const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      // Delete settings and corrections
      await deleteDoc(doc(db, "users", userId, "settings", "preferences")).catch(() => {});
      
      const corrRef = collection(db, "users", userId, "corrections");
      const corrSnap = await getDocs(corrRef);
      await Promise.all(corrSnap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.warn("Firestore cloud wipe error or partial cleanup:", err);
    }

    try {
      // Sign out
      await auth.signOut();
    } catch {
      // Ignored
    }
  }
}
