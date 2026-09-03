import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Compass,
  BookOpen,
  BarChart3,
  ShieldCheck,
  HeartHandshake,
  Flame,
  LogOut,
  UserPlus,
  Shield,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { UserSettings } from "../types.js";

interface NavbarProps {
  activeTab: "reflect" | "timeline" | "patterns" | "companion" | "security";
  setActiveTab: (tab: "reflect" | "timeline" | "patterns" | "companion" | "security") => void;
  userEmail: string;
  userName?: string;
  userPhotoURL?: string;
  settings: UserSettings;
  onOpenSupport: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userEmail,
  userName,
  userPhotoURL,
  settings,
  onOpenSupport,
  onSignOut,
  onSwitchAccount,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsSignOutModalOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const handleOpenSignOutModal = () => {
    setIsProfileOpen(false);
    setIsSignOutModalOpen(true);
  };

  const handleConfirmSignOut = () => {
    setIsSignOutModalOpen(false);
    onSignOut();
  };

  const handleSwitchAccountClick = () => {
    setIsProfileOpen(false);
    onSwitchAccount();
  };

  const userInitial = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <>
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

          {/* Right side controls: Streak, Support & Gmail-style Profile */}
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

            {/* Gmail-Style Profile Icon & Dropdown Container */}
            <div className="relative pl-1 border-l border-slate-800">
              <button
                ref={profileButtonRef}
                id="navbar-profile-avatar-btn"
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="relative flex items-center justify-center p-0.5 rounded-full ring-2 ring-transparent hover:ring-teal-500/60 focus:ring-teal-500 focus:outline-none transition-all cursor-pointer"
                title={`Google Account: ${userEmail || "Signed In"}`}
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
              >
                {userPhotoURL ? (
                  <img
                    src={userPhotoURL}
                    alt={userName || userEmail || "User avatar"}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 via-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {userInitial}
                  </div>
                )}
              </button>

              {/* Gmail-Like Profile Dropdown Menu */}
              {isProfileOpen && (
                <div
                  ref={dropdownRef}
                  id="navbar-profile-dropdown-menu"
                  className="absolute right-0 mt-3 w-80 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-4 text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                  aria-orientation="vertical"
                >
                  {/* Account Info Header */}
                  <div className="flex flex-col items-center text-center pb-4 border-b border-slate-800/90">
                    <div className="relative mb-2.5">
                      {userPhotoURL ? (
                        <img
                          src={userPhotoURL}
                          alt={userName || userEmail || "User"}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-full object-cover border-2 border-teal-500/40 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-500 via-indigo-600 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg border-2 border-slate-700">
                          {userInitial}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Active Session" />
                    </div>

                    {userName && (
                      <h4 className="text-sm font-semibold text-white tracking-tight">
                        {userName}
                      </h4>
                    )}
                    <p className="text-xs text-slate-400 font-mono break-all px-2 mt-0.5">
                      {userEmail}
                    </p>

                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-[11px] font-medium text-teal-300">
                      <Shield className="w-3 h-3 text-teal-400" />
                      <span>Owner-Isolated Workspace</span>
                    </div>
                  </div>

                  {/* Menu Action Items */}
                  <div className="pt-2 space-y-1">
                    {/* Switch Account */}
                    <button
                      id="profile-menu-switch-account-btn"
                      type="button"
                      onClick={handleSwitchAccountClick}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer group text-left"
                      role="menuitem"
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200 group-hover:text-white">
                          Switch account
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Sign in with a different Google account
                        </div>
                      </div>
                    </button>

                    {/* Sign Out */}
                    <button
                      id="profile-menu-sign-out-btn"
                      type="button"
                      onClick={handleOpenSignOutModal}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 transition-all text-xs font-medium cursor-pointer group text-left"
                      role="menuitem"
                    >
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200 group-hover:text-rose-300">
                          Sign out
                        </div>
                        <div className="text-[11px] text-slate-400">
                          End active private reflection session
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Footer note */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal-400/80" />
                    <span>All reflections are securely encrypted & isolated</span>
                  </div>
                </div>
              )}
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

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-modal-title"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
            <button
              onClick={() => setIsSignOutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3
                  id="signout-modal-title"
                  className="text-lg font-semibold text-white tracking-tight font-display"
                >
                  Sign out of Aurora?
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  You will be returned to the landing page. Your journal entries are safe and will be here when you sign back in.
                </p>
                <p className="text-xs text-slate-400 pt-1">
                  Active account: <span className="font-mono text-teal-300">{userEmail}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="signout-confirm-button"
                type="button"
                onClick={handleConfirmSignOut}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

