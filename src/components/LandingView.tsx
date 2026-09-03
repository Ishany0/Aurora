import React, { useState } from "react";
import { Sparkles, Shield, ArrowRight, Lock, KeyRound, AlertCircle, RefreshCw, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { clientConfig } from "../lib/firebase.js";

interface LandingViewProps {
  onSignIn: (useRedirect?: boolean) => void;
  onGuestSignIn?: () => void;
  isSigningIn?: boolean;
  authError?: {
    code: string;
    message: string;
    details?: string;
  } | null;
  onClearError?: () => void;
  onOpenSupport: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSignIn,
  onGuestSignIn,
  isSigningIn = false,
  authError = null,
  onClearError,
  onOpenSupport,
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopyHost = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleCopyError = () => {
    if (authError) {
      const errorDump = JSON.stringify(
        {
          code: authError.code,
          message: authError.message,
          details: authError.details,
          host: currentHost,
          authDomain: clientConfig.authDomain,
          projectId: clientConfig.projectId,
        },
        null,
        2
      );
      navigator.clipboard.writeText(errorDump);
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 2000);
    }
  };

  return (
    <div id="landing-view" className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-100">
      
      {/* CSS/SVG Aurora Borealis Ambient Background Graphic */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg
          className="absolute w-[140%] h-[120%] -top-20 -left-[20%] opacity-25 animate-aurora"
          viewBox="0 0 1000 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="auroraGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#2dd4bf" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
            <filter id="auroraGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="50" />
            </filter>
          </defs>
          <path
            d="M50,150 Q200,50 450,180 T900,100 Q950,300 700,450 T200,400 Z"
            fill="url(#auroraGrad1)"
            filter="url(#auroraGlow)"
          />
          <path
            d="M150,250 Q400,120 650,280 T950,200 Q800,500 500,480 T50,350 Z"
            fill="#2dd4bf"
            opacity="0.3"
            filter="url(#auroraGlow)"
          />
        </svg>
      </div>

      {/* Main Hero Container */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pt-10 pb-16 sm:pt-16 sm:pb-20 text-center space-y-7 animate-fade-in">
        
        {/* Core Value Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-teal-300 text-xs font-semibold shadow-md shadow-slate-950/50">
          <Sparkles className="w-4 h-4 text-teal-400 animate-pulse-subtle" />
          <span>Private Multimodal Reflection Workspace</span>
        </div>

        {/* Primary Headline */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-display leading-[1.15]">
            Reflect privately. <br />
            <span className="bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Find one manageable next step.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans max-w-xl mx-auto">
            Aurora turns your private reflections into grounded emotional insights, calibrated tag memory, and calm, optional next steps.
          </p>
        </div>

        {/* Visible Privacy Reassurance */}
        <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl max-w-md mx-auto shadow-inner">
          <Lock className="w-4 h-4 text-teal-400 shrink-0" />
          <span>Strict owner-isolated encryption and private per-account Firestore paths.</span>
        </div>

        {/* Auth Error Banner & Actionable Guidance */}
        {authError && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-left space-y-3 shadow-xl backdrop-blur-sm animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Authentication Notice</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-rose-900/60 border border-rose-700/60 text-[11px] font-mono text-rose-200">
                {authError.code}
              </span>
            </div>

            <p className="text-xs text-rose-200 leading-relaxed">
              {authError.message}
            </p>

            {authError.code === "auth/configuration-not-found" && (
              <div className="p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/40 text-xs space-y-2 text-slate-200 shadow-lg">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Firebase Console Setup Required:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    Open <strong className="text-white">Firebase Console</strong> (project: <code className="text-teal-300 font-mono bg-slate-950 px-1 py-0.5 rounded border border-slate-800">{clientConfig.projectId}</code>).
                  </li>
                  <li>
                    Click <strong className="text-white">Authentication</strong> in the left sidebar (click <em>"Get Started"</em> if it's the first time).
                  </li>
                  <li>
                    Go to <strong className="text-white">Sign-in method</strong> → click <strong className="text-white">Google</strong> → toggle <strong className="text-teal-300">Enable</strong> → select support email → <strong className="text-white">Save</strong>.
                  </li>
                  <li>
                    Go to <strong className="text-white">Settings</strong> tab → <strong className="text-white">Authorized domains</strong> → add <code className="text-teal-300 font-mono bg-slate-950 px-1 py-0.5 rounded border border-slate-800">{currentHost}</code>.
                  </li>
                </ol>
                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyHost}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? "Domain Copied!" : "Copy App Domain"}</span>
                  </button>
                  {onGuestSignIn && (
                    <button
                      type="button"
                      onClick={onGuestSignIn}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Use Instant Private Session</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {authError.code === "auth/unauthorized-domain" && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-900/60 text-xs space-y-2">
                <p className="text-slate-300 font-medium">Quick Firebase Console Fix:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Open <strong>Firebase Console → Authentication → Settings → Authorized Domains</strong></li>
                  <li>Click <strong>Add domain</strong></li>
                  <li>
                    Paste your current host: <code className="text-teal-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{currentHost}</code>
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={handleCopyHost}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? "Domain Copied!" : "Copy Domain to Clipboard"}</span>
                </button>
              </div>
            )}

            {authError.code === "auth/operation-not-allowed" && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-900/60 text-xs space-y-1.5 text-slate-300">
                <p className="font-medium">Firebase Console Step:</p>
                <p className="text-slate-400 text-[11px]">
                  Navigate to <strong>Firebase Console → Authentication → Sign-in method</strong>, enable <strong>Google</strong> as a provider, and save.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyError}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedError ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedError ? "Error Diagnostics Copied" : "Copy Debug Payload"}</span>
              </button>
              {onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-[11px] text-rose-300 hover:text-rose-100 underline cursor-pointer"
                >
                  Dismiss Notice
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Call-to-Action: Sign In Controls */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2 max-w-sm mx-auto">
          {/* Main Popup Sign-In Button */}
          <button
            id="landing-google-signin-btn"
            onClick={() => onSignIn(false)}
            disabled={isSigningIn}
            className="w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 disabled:opacity-50 text-slate-950 font-bold text-base shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <>
                <RefreshCw className="w-5 h-5 text-slate-950 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5 text-slate-950" />
                <span>Sign in with Google</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>

          {/* Secondary Alternative: Redirect Sign-In */}
          <button
            type="button"
            onClick={() => onSignIn(true)}
            disabled={isSigningIn}
            className="text-xs text-teal-400 hover:text-teal-300 underline font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Use full-page redirect authentication if popups are blocked or partitioned"
          >
            <span>Having popup trouble? Try full-page redirect sign-in</span>
          </button>

          {/* Instant Private Session Button */}
          {onGuestSignIn && (
            <div className="w-full pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">or</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
              <button
                id="landing-instant-private-btn"
                type="button"
                onClick={onGuestSignIn}
                disabled={isSigningIn}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-teal-500/40 cursor-pointer disabled:opacity-50"
                title="Open a private isolated session without Firebase Console configuration"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Continue with Instant Private Session</span>
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center pt-1">
            Private, client-isolated journaling with grounded emotion insights & companion support.
          </p>
        </div>

        {/* Diagnostic Toggle Accordion */}
        <div className="max-w-md mx-auto pt-2">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-xs text-slate-500 hover:text-slate-400 inline-flex items-center gap-1 font-mono transition-colors cursor-pointer"
          >
            <span>{showDiagnostics ? "Hide Firebase diagnostics" : "Show Firebase setup & domain diagnostics"}</span>
            {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDiagnostics && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs font-mono space-y-2 animate-fade-in">
              <div className="text-teal-400 font-bold font-sans text-xs pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>Firebase Authentication Details</span>
                <span className="text-[10px] text-slate-400 font-mono">SDK v10+</span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <p><span className="text-slate-500">Current Host:</span> {currentHost || "localhost"}</p>
                <p><span className="text-slate-500">Current Origin:</span> {currentOrigin || "http://localhost:3000"}</p>
                <p><span className="text-slate-500">Auth Domain:</span> {clientConfig.authDomain || "default"}</p>
                <p><span className="text-slate-500">Project ID:</span> {clientConfig.projectId || "default"}</p>
              </div>
              <div className="pt-2 text-[10px] text-slate-400 font-sans border-t border-slate-800">
                Ensure <code className="text-teal-300 font-mono">{currentHost}</code> is listed under Firebase Console → Authentication → Settings → Authorized Domains.
              </div>
            </div>
          )}
        </div>

        {/* 3-Step Value Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left max-w-3xl mx-auto">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold font-mono">
              01
            </div>
            <h2 className="text-sm font-bold text-white font-display">Reflect Freely</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Express your thoughts through typed text, continuous voice dictation, or private photo uploads.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold font-mono">
              02
            </div>
            <h2 className="text-sm font-bold text-white font-display">Grounded Signal</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive structured mood detection with confidence ratings, topic labels, and transparent evidence.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
              03
            </div>
            <h2 className="text-sm font-bold text-white font-display">One Manageable Step</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never get overwhelmed. Aurora offers exactly one practical step that you can accept, edit, or dismiss.
            </p>
          </div>
        </div>

      </section>

      {/* Non-Clinical Safety Bar */}
      <footer className="relative z-10 py-6 px-4 border-t border-slate-900/80 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Aurora is private personal journaling, not a clinical mental health or crisis service.</span>
          </div>
          <button
            onClick={onOpenSupport}
            className="text-slate-400 hover:text-slate-200 underline font-medium transition-colors cursor-pointer"
          >
            Crisis & Wellbeing Information
          </button>
        </div>
      </footer>

    </div>
  );
};
