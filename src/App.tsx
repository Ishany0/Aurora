import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.js";
import { LandingView } from "./components/LandingView.js";
import { ReflectStudio } from "./components/ReflectStudio.js";
import { TimelineView } from "./components/TimelineView.js";
import { PatternDigestView } from "./components/PatternDigestView.js";
import { CompanionView } from "./components/CompanionView.js";
import { SecurityPanel } from "./components/SecurityPanel.js";
import { SupportModal } from "./components/SupportModal.js";
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
  const [activeTab, setActiveTab] = useState<"landing" | "reflect" | "timeline" | "patterns" | "companion" | "security">("landing");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const userEmail = currentUser?.email || "alex.reflections@gmail.com";
  const userId = currentUser?.uid || "user_alex_prod";
  const isFirebaseUser = currentUser !== null;
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings(userId));
  const [corrections, setCorrections] = useState<MoodCorrection[]>([]);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load initial data and subscribe to Firestore when authenticated
  useEffect(() => {
    setEntries(getStoredEntries());
    setSettings(getStoredSettings(userId));
    setCorrections(getStoredCorrections());

    // If authenticated with Firebase, listen for real-time Firestore updates
    if (currentUser) {
      const unsubscribeEntries = subscribeToUserEntries(currentUser.uid, (cloudEntries) => {
        setEntries(cloudEntries);
      });
      return () => unsubscribeEntries();
    }
  }, [userId, currentUser]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn("Sign in popup cancelled or encountered error:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleEntrySaved = (savedEntry: JournalEntry) => {
    setEntries(getStoredEntries());
    setCorrections(getStoredCorrections());

    // Update streak if needed
    const updatedSettings: UserSettings = {
      ...settings,
      streakDays: Math.min(settings.streakDays + 1, 30),
      updatedAt: new Date().toISOString(),
    };
    setSettings(updatedSettings);
    saveStoredSettings(updatedSettings);
    syncSettingsToFirestore(userId, updatedSettings).catch(() => {});
  };

  const handleRenamePet = (newName: string) => {
    const updated: UserSettings = {
      ...settings,
      petName: newName,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    saveStoredSettings(updated);
    syncSettingsToFirestore(userId, updated).catch(() => {});
  };

  const handleDataWiped = () => {
    setEntries([]);
    setCorrections([]);
    const resetSettings = getStoredSettings(userId);
    setSettings(resetSettings);
    setActiveTab("reflect");
  };

  const latestMood = entries.length > 0 ? (entries[0].userMoodOverride || entries[0].mood || "Calm") : "Calm";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950 font-sans">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-900/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={userEmail}
        isFirebaseUser={isFirebaseUser}
        settings={settings}
        onOpenSupport={() => setIsSupportOpen(true)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main View Container */}
      <main className="flex-1 relative z-10">
        {activeTab === "landing" && (
          <LandingView
            onSignIn={handleSignIn}
            onContinueAsGuest={() => setActiveTab("reflect")}
            onOpenSupport={() => setIsSupportOpen(true)}
          />
        )}

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
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Non-Clinical Disclaimer & Crisis Info
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Privacy & Security
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
