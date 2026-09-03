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
import {
  auth,
  googleProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
  clientConfig,
} from "./lib/firebase.js";
import type { JournalEntry, UserSettings, MoodCorrection } from "./types.js";
import { Shield } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<{
    code: string;
    message: string;
    details?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"reflect" | "timeline" | "patterns" | "companion" | "security">("reflect");
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => getStoredSettings(currentUser?.uid || ""));
  const [corrections, setCorrections] = useState<MoodCorrection[]>([]);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Check for redirect result on page load
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("[Aurora Auth] getRedirectResult SUCCESS:", {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
          });
          setCurrentUser(result.user);
          setAuthLoading(false);
        }
      })
      .catch((err: any) => {
        console.error("[Aurora Auth] getRedirectResult Error:", {
          code: err?.code,
          message: err?.message,
          customData: err?.customData,
        });
        setAuthError({
          code: err?.code || "auth/redirect-error",
          message: err?.message || "Redirect authentication failed.",
        });
      });
  }, []);

  // Restore active local session if present on mount
  useEffect(() => {
    try {
      const storedLocalUser = localStorage.getItem("aurora_active_local_user");
      if (storedLocalUser && !currentUser) {
        const parsed = JSON.parse(storedLocalUser);
        if (parsed && parsed.uid) {
          console.log("[Aurora Auth] Restored local private session:", parsed.email);
          setCurrentUser(parsed);
          setAuthLoading(false);
        }
      }
    } catch (e) {
      console.warn("[Aurora Auth] Error reading local user session:", e);
    }
  }, []);

  // Central Firebase Authentication listener
  useEffect(() => {
    console.log("[Aurora Auth] Initializing onAuthStateChanged listener...", {
      authDomain: clientConfig.authDomain,
      projectId: clientConfig.projectId,
    });

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log("[Aurora Auth] onAuthStateChanged:", user ? `Authenticated as ${user.email} (${user.uid})` : "Unauthenticated");
        if (user) {
          // If a real Firebase user logs in, prioritize it and clear any mock local session
          localStorage.removeItem("aurora_active_local_user");
          setCurrentUser(user);
        } else {
          // Check if local private session is active before setting to null
          const storedLocalUser = localStorage.getItem("aurora_active_local_user");
          if (storedLocalUser) {
            try {
              const parsed = JSON.parse(storedLocalUser);
              if (parsed?.uid) {
                setCurrentUser(parsed);
                setAuthLoading(false);
                return;
              }
            } catch {}
          }
          setCurrentUser(null);
        }
        setAuthLoading(false);
      },
      (error) => {
        console.error("[Aurora Auth] onAuthStateChanged error:", error);
        setAuthError({
          code: (error as any)?.code || "auth/state-error",
          message: error.message,
        });
        setAuthLoading(false);
      }
    );

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

  const handleSignIn = async (useRedirect = false) => {
    setAuthError(null);
    setIsSigningIn(true);
    console.log(`[Aurora Auth] Starting sign-in flow (mode: ${useRedirect ? "redirect" : "popup"})...`, {
      authDomain: clientConfig.authDomain,
      projectId: clientConfig.projectId,
      origin: window.location.origin,
      hostname: window.location.hostname,
    });

    try {
      if (useRedirect) {
        console.log("[Aurora Auth] Invoking signInWithRedirect...");
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      console.log("[Aurora Auth] Invoking signInWithPopup...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Aurora Auth] signInWithPopup SUCCESS:", {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      });

      // Synchronize immediately
      setCurrentUser(result.user);
      setAuthLoading(false);
    } catch (err: any) {
      console.error("[Aurora Auth] Sign-in failed with error:", {
        code: err?.code,
        message: err?.message,
        customData: err?.customData,
        stack: err?.stack,
      });

      let friendlyMessage = err?.message || "An authentication error occurred.";
      if (err?.code === "auth/configuration-not-found") {
        friendlyMessage = `Firebase Authentication is not yet enabled or configured in Firebase Console for project "${clientConfig.projectId}". Open Firebase Console → Authentication → click "Get Started" → enable Google provider under "Sign-in method". In the meantime, you can click "Continue with Instant Private Session" below to explore all features immediately.`;
      } else if (err?.code === "auth/unauthorized-domain") {
        friendlyMessage = `This domain (${window.location.hostname}) is not authorized in Firebase Authentication. Add it to Firebase Console → Authentication → Settings → Authorized Domains.`;
      } else if (err?.code === "auth/operation-not-allowed") {
        friendlyMessage = "Google provider is not enabled in Firebase Console. Go to Authentication → Sign-in method and enable Google.";
      } else if (err?.code === "auth/popup-closed-by-user") {
        friendlyMessage = "The sign-in popup was closed before completing authentication. Please try again or use redirect sign-in.";
      } else if (err?.code === "auth/popup-blocked") {
        friendlyMessage = "The popup was blocked by your browser. Please allow popups or use redirect sign-in.";
      } else if (err?.code === "auth/network-request-failed") {
        friendlyMessage = "Network error connecting to Firebase Auth. Please verify your connection or domain configuration.";
      }

      setAuthError({
        code: err?.code || "auth/unknown",
        message: friendlyMessage,
        details: err?.message,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    console.log("[Aurora Auth] Starting guest/instant private session...");

    try {
      // First try Firebase anonymous sign-in if enabled
      const anonResult = await signInAnonymously(auth);
      console.log("[Aurora Auth] signInAnonymously SUCCESS:", anonResult.user.uid);
      setCurrentUser(anonResult.user);
      setAuthLoading(false);
    } catch (err: any) {
      console.warn("[Aurora Auth] Anonymous sign-in unavailable, establishing local isolated private session:", err?.code);
      // Fall back safely to isolated local private workspace
      const localId = "aurora-private-local-user";
      const localUser = {
        uid: localId,
        email: "private-journaler@aurora.local",
        displayName: "Private Reflection Workspace",
        isAnonymous: true,
      } as unknown as User;

      localStorage.setItem("aurora_active_local_user", JSON.stringify(localUser));
      setCurrentUser(localUser);
      setAuthLoading(false);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSwitchAccount = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    console.log("[Aurora Auth] Initiating account switch via Google popup...");

    try {
      // Google provider configured with select_account prompt to force account chooser
      const switchProvider = new GoogleAuthProvider();
      switchProvider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, switchProvider);
      console.log("[Aurora Auth] Switch account successful:", {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      });

      localStorage.removeItem("aurora_active_local_user");
      setCurrentUser(result.user);
      setAuthLoading(false);
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        console.error("[Aurora Auth] Switch account error:", err);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // 1. Immediately wipe user state from React memory before sign-out completes
      setEntries([]);
      setCorrections([]);
      setSettings(getStoredSettings(""));
      setActiveTab("reflect");
      localStorage.removeItem("aurora_active_local_user");
      // 2. Call Firebase Auth signOut
      if (auth.currentUser) {
        await signOut(auth);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Sign out error:", err);
      localStorage.removeItem("aurora_active_local_user");
      setCurrentUser(null);
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
          onGuestSignIn={handleGuestSignIn}
          isSigningIn={isSigningIn}
          authError={authError}
          onClearError={() => setAuthError(null)}
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
  const userName = currentUser.displayName || undefined;
  const userPhotoURL = currentUser.photoURL || undefined;
  const latestMood = entries.length > 0 ? (entries[0].userMoodOverride || entries[0].mood || "Calm") : "Calm";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950 font-sans">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-900/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation with Gmail-style Profile Dropdown */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={userEmail}
        userName={userName}
        userPhotoURL={userPhotoURL}
        settings={settings}
        onOpenSupport={() => setIsSupportOpen(true)}
        onSignOut={handleSignOut}
        onSwitchAccount={handleSwitchAccount}
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
            onSignOut={handleSignOut}
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
