import React from "react";
import { Sparkles, Shield, Lock } from "lucide-react";

interface SecureLoadingScreenProps {
  message?: string;
}

export const SecureLoadingScreen: React.FC<SecureLoadingScreenProps> = ({
  message = "Loading Aurora securely...",
}) => {
  return (
    <div
      id="secure-loading-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-teal-500 selection:text-slate-950 font-sans"
    >
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-teal-900/15 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-sm w-full mx-auto flex flex-col items-center text-center space-y-6">
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-teal-400 to-amber-300 p-0.5 shadow-2xl shadow-teal-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-teal-300 animate-pulse" />
          </div>
        </div>

        {/* Brand & Loading Label */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-white font-display">
            Aurora
          </h1>
          <p className="text-sm font-medium text-teal-300 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>{message}</span>
          </p>
        </div>

        {/* Loading Spinner Indicator */}
        <div className="flex items-center gap-1.5 py-1">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-4 border-t border-slate-900 w-full justify-center">
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          <span>Verifying Firebase Authentication credentials</span>
        </div>
      </div>
    </div>
  );
};
