import React from "react";
import { Sparkles, Heart, Shield, Award, Flame, RefreshCw } from "lucide-react";
import type { UserSettings, PetMood } from "../types.js";

interface CompanionViewProps {
  settings: UserSettings;
  latestMood?: string;
  onRenamePet: (newName: string) => void;
}

export const CompanionView: React.FC<CompanionViewProps> = ({
  settings,
  latestMood = "Calm",
  onRenamePet,
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(settings.petName);

  // Map latest reflection mood to pet companion mood
  const getPetMood = (mood: string): PetMood => {
    const m = mood.toLowerCase();
    if (m.includes("joy") || m.includes("grateful") || m.includes("excited") || m.includes("celebrat")) {
      return "celebrating";
    }
    if (m.includes("anxious") || m.includes("exhaust") || m.includes("heavy") || m.includes("sad") || m.includes("stress")) {
      return "comforting";
    }
    if (m.includes("happy") || m.includes("relieved") || m.includes("proud")) {
      return "joyful";
    }
    return "calm";
  };

  const petMood = getPetMood(latestMood);

  const getCompanionMessage = (mood: PetMood, petName: string) => {
    switch (mood) {
      case "celebrating":
        return `${petName} is radiating bright golden sparks, celebrating the breakthrough and momentum you found today!`;
      case "comforting":
        return `${petName} curls up quietly beside you with a gentle twilight warmth. No rushing—take all the time and breaths you need.`;
      case "joyful":
        return `${petName} perks its astral ears and glows with cheerful cyan energy, sharing in your light!`;
      case "calm":
      default:
        return `${petName} is breathing in peaceful rhythm under the aurora lights, holding a steady, tranquil space for your reflections.`;
    }
  };

  const companionLevel = Math.max(1, Math.floor((settings.streakDays + settings.completedActionsCount) / 2) + 1);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onRenamePet(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mindful Astral Companion</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight font-display">
          Meet {settings.petName}
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Your private reflection companion who resonates with your mood state, grows alongside your streaks, and offers comforting presence.
        </p>
      </div>

      {/* Main Companion Sanctuary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 shadow-2xl">
        {/* Aurora Background Glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-48 blur-3xl opacity-30 pointer-events-none transition-colors duration-1000 ${
          petMood === "celebrating" ? "bg-amber-400" :
          petMood === "comforting" ? "bg-teal-400" :
          petMood === "joyful" ? "bg-indigo-400" : "bg-emerald-400"
        }`} />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          
          {/* Level & Mood Tag */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Bond Level {companionLevel}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize flex items-center gap-1.5 ${
              petMood === "celebrating" ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
              petMood === "comforting" ? "bg-teal-500/10 border-teal-500/30 text-teal-300" :
              petMood === "joyful" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" :
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}>
              <Heart className="w-3.5 h-3.5" />
              Mood: {petMood}
            </span>
          </div>

          {/* SVG Animated Astral Fox Character */}
          <div className="relative group cursor-pointer transition-transform duration-500 hover:scale-105">
            <div className="w-56 h-56 rounded-full bg-slate-950/60 border border-slate-800 flex items-center justify-center p-4 relative shadow-inner">
              
              {/* Astral Pulse Ring */}
              <div className="absolute inset-0 rounded-full border border-teal-500/20 animate-ping opacity-20" />

              <svg viewBox="0 0 200 200" className="w-48 h-48">
                <defs>
                  <linearGradient id="auroraFoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={petMood === "celebrating" ? "#FBBF24" : petMood === "comforting" ? "#2DD4BF" : "#818CF8"} />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#C084FC" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Floating Orbit Particles */}
                <circle cx="45" cy="50" r="3" fill="#38BDF8" className="animate-pulse" />
                <circle cx="160" cy="65" r="2.5" fill="#FBBF24" className="animate-pulse" />
                <circle cx="150" cy="140" r="3" fill="#C084FC" className="animate-pulse" />
                <circle cx="40" cy="130" r="2" fill="#2DD4BF" className="animate-pulse" />

                {/* Astral Tail */}
                <path
                  d="M130,120 Q170,140 165,95 Q160,70 135,100 Z"
                  fill="url(#auroraFoxGrad)"
                  opacity="0.85"
                  className="animate-pulse"
                />

                {/* Fox Body */}
                <ellipse cx="100" cy="125" rx="42" ry="32" fill="url(#auroraFoxGrad)" />

                {/* White Chest Fur */}
                <path d="M90,110 Q100,135 110,110 Q100,120 90,110 Z" fill="#F8FAFC" opacity="0.9" />

                {/* Fox Head */}
                <polygon points="65,95 135,95 100,140" fill="url(#auroraFoxGrad)" />
                
                {/* Left Ear */}
                <polygon points="70,95 60,50 85,75" fill="url(#auroraFoxGrad)" />
                <polygon points="68,90 63,58 80,77" fill="#FCE7F3" opacity="0.6" />

                {/* Right Ear */}
                <polygon points="130,95 140,50 115,75" fill="url(#auroraFoxGrad)" />
                <polygon points="132,90 137,58 120,77" fill="#FCE7F3" opacity="0.6" />

                {/* Forehead Star Gem */}
                <polygon points="100,82 103,89 110,90 105,95 106,102 100,98 94,102 95,95 90,90 97,89" fill="#FEF08A" />

                {/* Eyes */}
                {petMood === "comforting" ? (
                  // Soft closed resting eyes
                  <>
                    <path d="M80,105 Q87,110 94,105" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M106,105 Q113,110 120,105" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : petMood === "celebrating" ? (
                  // Joyful arched closed eyes
                  <>
                    <path d="M80,108 Q87,102 94,108" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M106,108 Q113,102 120,108" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : (
                  // Gentle open eyes with sparkle
                  <>
                    <ellipse cx="86" cy="105" rx="4" ry="5.5" fill="#0F172A" />
                    <circle cx="85" cy="103" r="1.5" fill="#FFFFFF" />
                    <ellipse cx="114" cy="105" rx="4" ry="5.5" fill="#0F172A" />
                    <circle cx="113" cy="103" r="1.5" fill="#FFFFFF" />
                  </>
                )}

                {/* Cute Nose */}
                <polygon points="98,128 102,128 100,131" fill="#0F172A" />
                <path d="M100,131 Q96,134 94,132 M100,131 Q104,134 106,132" stroke="#0F172A" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                {/* Cheek Blush */}
                <circle cx="76" cy="115" r="4.5" fill="#F43F5E" opacity="0.35" />
                <circle cx="124" cy="115" r="4.5" fill="#F43F5E" opacity="0.35" />
              </svg>
            </div>
          </div>

          {/* Name & Rename Control */}
          <div className="space-y-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                  maxLength={20}
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-400"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-xl font-bold text-white">{settings.petName}</h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  Rename
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400">Harmonized with recent reflection: &ldquo;{latestMood}&rdquo;</p>
          </div>

          {/* Companion Message Box */}
          <div className="w-full max-w-md p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-sm text-slate-200 leading-relaxed shadow-sm">
            {getCompanionMessage(petMood, settings.petName)}
          </div>

        </div>

      </div>

      {/* Bond Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-display">{settings.streakDays} Days</div>
            <div className="text-xs text-slate-400">Active Reflection Streak</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-display">{settings.completedActionsCount} Actions</div>
            <div className="text-xs text-slate-400">Completed Next Steps</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-display">100% Private</div>
            <div className="text-xs text-slate-400">Local-first Data Isolation</div>
          </div>
        </div>

      </div>

    </div>
  );
};
