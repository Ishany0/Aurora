import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.js";
import { LandingView } from "./components/LandingView.js";
import { ReflectStudio } from "./components/ReflectStudio.js";
import { TimelineView } from "./components/TimelineView.js";
import { PatternDigestView } from "./components/PatternDigestView.js";
import { CompanionView } from "./components/CompanionView.js";
import { SecurityPanel } from "./components/SecurityPanel.js";
import { SupportModal } from "./components/SupportModal.js";
import { SecureLoadingScreen } from "./components/SecureLoadingScreen.js";
import {
  getStoredEntries,
  getStoredSettings,
  getStoredCorrections,
  saveStoredSettings,
  subscribeToUserEntries,
  syncSettingsToFirestore,
} from "./lib/storage.js";
import { auth, googleProvider } from "./lib/firebase.js";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import type { JournalEntry, UserSettings, MoodCorrection } from "./types.js";
import { Shield } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"reflect" | "timeline" | "patterns" | "companion" | "security">("reflect");
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => getStoredSettings(currentUser?.uid || ""));
  const [corrections, setCorrections] = useState<MoodCorrection[]>([]);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Central Firebase Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user ?? null);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync isolated user state whenever currentUser changes
  useEffect(() => {
    // If signed out, immediately wipe in-memory state to prevent data leakage between accounts
    if (!currentUser) {
      setEntries([]);
      setCorrections([]);
      setSettings(getStoredSettings(""));
      return;
    }

    const uid = currentUser.uid;

    // Load initial local-scoped data for this specific user
    setEntries(getStoredEntries(uid));
    setSettings(getStoredSettings(uid));
    setCorrections(getStoredCorrections(uid));

    // Subscribe to Firestore entries under /users/{uid}/entries in real-time
    const unsubscribeEntries = subscribeToUserEntries(
      uid,
      (cloudEntries) => {
        // Validate ownership before rendering
        const userOnly = cloudEntries.filter((entry) => entry.userId === uid);
        setEntries(userOnly);
      },
      (err) => {
        console.warn("Firestore subscription notice:", err);
      }
    );

    return () => {
      unsubscribeEntries();
    };
  }, [currentUser]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn("Sign in popup encountered an error or was closed:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      // 1. Immediately wipe user state from React memory before sign-out completes
      setEntries([]);
      setCorrections([]);
      setSettings(getStoredSettings(""));
      setActiveTab("reflect");
      // 2. Call Firebase Auth signOut
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleEntrySaved = (savedEntry: JournalEntry) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    // Refresh scoped local entries
    setEntries(getStoredEntries(uid));
    setCorrections(getStoredCorrections(uid));

    // Update streak if needed
    const updatedSettings: UserSettings = {
      ...settings,
      userId: uid,
      streakDays: Math.min(settings.streakDays + 1, 30),
      updatedAt: new Date().toISOString(),
    };
    setSettings(updatedSettings);
    saveStoredSettings(uid, updatedSettings);
    syncSettingsToFirestore(uid, updatedSettings).catch(() => {});
  };

  const handleRenamePet = (newName: string) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const updated: UserSettings = {
      ...settings,
      userId: uid,
      petName: newName,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    saveStoredSettings(uid, updated);
    syncSettingsToFirestore(uid, updated).catch(() => {});
  };

  const handleDataWiped = () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    setEntries([]);
    setCorrections([]);
    const resetSettings = getStoredSettings(uid);
    setSettings(resetSettings);
    setActiveTab("reflect");
  };

  // State 1: Firebase Auth is initializing
  if (authLoading) {
    return <SecureLoadingScreen message="Loading Aurora securely..." />;
  }

  // State 2: Unauthenticated visitor
  // Render ONLY the public Sign-In Landing screen.
  // Private dashboard, history, reflection studio, and queries are NEVER rendered or executed.
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <LandingView
          onSignIn={handleSignIn}
          onOpenSupport={() => setIsSupportOpen(true)}
        />
        <SupportModal
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />
      </div>
    );
  }

  // State 3: Authenticated User
  // Render ONLY the private application shell scoped to currentUser.uid.
  const userId = currentUser.uid;
  const userEmail = currentUser.email || "";
  const latestMood = entries.length > 0 ? (entries[0].userMoodOverride || entries[0].mood || "Calm") : "Calm";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950 font-sans">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-900/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={userEmail}
        settings={settings}
        onOpenSupport={() => setIsSupportOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Authenticated View Container */}
      <main className="flex-1 relative z-10">
        {activeTab === "reflect" && (
          <ReflectStudio
            userId={userId}
            settings={settings}
            corrections={corrections}
            onEntrySaved={handleEntrySaved}
            onOpenSupport={() => setIsSupportOpen(true)}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineView
            entries={entries}
            userId={userId}
            onEntriesChange={(updated) => setEntries(updated)}
            onNavigateToReflect={() => setActiveTab("reflect")}
          />
        )}

        {activeTab === "patterns" && (
          <PatternDigestView
            entries={entries}
            userId={userId}
          />
        )}

        {activeTab === "companion" && (
          <CompanionView
            settings={settings}
            latestMood={latestMood}
            onRenamePet={handleRenamePet}
          />
        )}

        {activeTab === "security" && (
          <SecurityPanel
            settings={settings}
            userId={userId}
            onSettingsChange={(updated) => setSettings(updated)}
            onDataWiped={handleDataWiped}
          />
        )}
      </main>

      {/* Global Support & Crisis Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Minimal Accessible Footer */}
      <footer className="relative z-10 border-t border-slate-900/80 bg-slate-950/80 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>Aurora — Private Multimodal Reflection</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Non-Clinical Disclaimer & Crisis Info
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Privacy & Security
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
