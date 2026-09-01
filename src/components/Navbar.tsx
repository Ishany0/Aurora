import React from "react";
import { Sparkles, Compass, BookOpen, BarChart3, ShieldCheck, HeartHandshake, Flame, LogOut } from "lucide-react";
import type { UserSettings } from "../types.js";

interface NavbarProps {
  activeTab: "reflect" | "timeline" | "patterns" | "companion" | "security";
  setActiveTab: (tab: "reflect" | "timeline" | "patterns" | "companion" | "security") => void;
  userEmail: string;
  settings: UserSettings;
  onOpenSupport: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userEmail,
  settings,
  onOpenSupport,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("reflect")}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-teal-400 to-amber-300 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight text-white font-display">
                Aurora
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Private Reflect
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Reflect privately. Find one manageable next step.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("reflect")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "reflect"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Reflect Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "timeline"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Journal</span>
          </button>

          <button
            onClick={() => setActiveTab("patterns")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "patterns"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Patterns</span>
          </button>

          <button
            onClick={() => setActiveTab("companion")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "companion"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Companion</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Security</span>
          </button>
        </nav>

        {/* Right side controls: Streak, Support & Account */}
        <div className="flex items-center gap-2.5">
          {/* Reflection Streak */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold" title="Consecutive Reflection Streak">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{settings.streakDays}d Streak</span>
          </div>

          {/* Quick Support / Disclaimer Button */}
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Crisis Resources & Non-Clinical Disclaimer"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Support</span>
          </button>

          {/* Auth Profile Badge & Sign Out Button */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm"
              title={userEmail || "Signed In"}
            >
              {(userEmail || "U").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign out of Aurora"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/95 py-2 px-1">
        <button
          onClick={() => setActiveTab("reflect")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium min-h-[44px] justify-center cursor-pointer ${
            activeTab === "reflect" ? "text-indigo-400" : "text-slate-400"
          }`}
          aria-label="Reflect Studio"
        >
          <Compass className="w-4 h-4" />
          <span>Reflect</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium min-h-[44px] justify-center cursor-pointer ${
            activeTab === "timeline" ? "text-indigo-400" : "text-slate-400"
          }`}
          aria-label="Journal timeline"
        >
          <BookOpen className="w-4 h-4" />
          <span>Journal</span>
        </button>

        <button
          onClick={() => setActiveTab("patterns")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium min-h-[44px] justify-center cursor-pointer ${
            activeTab === "patterns" ? "text-indigo-400" : "text-slate-400"
          }`}
          aria-label="Patterns"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Patterns</span>
        </button>

        <button
          onClick={() => setActiveTab("companion")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium min-h-[44px] justify-center cursor-pointer ${
            activeTab === "companion" ? "text-amber-400" : "text-slate-400"
          }`}
          aria-label="Companion"
        >
          <Sparkles className="w-4 h-4" />
          <span>Companion</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium min-h-[44px] justify-center cursor-pointer ${
            activeTab === "security" ? "text-teal-400" : "text-slate-400"
          }`}
          aria-label="Security & Privacy"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security</span>
        </button>
      </div>
    </header>
  );
};
