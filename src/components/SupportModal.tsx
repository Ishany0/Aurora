import React from "react";
import { X, HeartHandshake, PhoneCall, MessageSquare, Globe, ShieldAlert, CheckCircle2 } from "lucide-react";
import { CRISIS_RESOURCES } from "../types.js";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-2 bg-gradient-to-r from-rose-500 via-amber-400 to-teal-400 blur-sm" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display">Wellbeing & Crisis Resources</h3>
            <p className="text-xs text-slate-400">Free, confidential support is available 24 hours a day.</p>
          </div>
        </div>

        {/* Non-Clinical Disclaimer */}
        <div className="p-3.5 mb-5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Important Notice: </span>
            Aurora is a private personal reflection workspace, <strong>not</strong> a clinician, diagnostic tool, or emergency medical service. If you are experiencing acute distress, thoughts of self-harm, or severe crisis, please reach out to trusted friends, family, or the dedicated crisis counselors below.
          </div>
        </div>

        {/* Resource Cards */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {CRISIS_RESOURCES.map((r, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-200">{r.name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {r.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{r.description}</p>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-md border border-teal-800/50">
                {r.contact.includes("Text") ? (
                  <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                ) : r.contact.includes("Call") ? (
                  <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                )}
                {r.contact}
              </div>
            </div>
          ))}
        </div>

        {/* Privacy reassurance */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>Crisis entries are never shared externally.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
