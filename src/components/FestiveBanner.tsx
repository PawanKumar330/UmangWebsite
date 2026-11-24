import { Calendar, Trophy, Music, Award, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FestiveBanner() {
  return (
    <div className="relative bg-[#2b0811] text-stone-100 rounded-xl p-8 sm:p-10 border border-[#48121e] shadow-sm overflow-hidden">
      {/* Subtle architectural hairline accents */}
      <div className="absolute top-0 right-0 w-64 h-full border-l border-white/[0.04] pointer-events-none hidden lg:block" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#42101b] text-amber-200/90 border border-amber-500/20 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Motihari College of Engineering • Annual Cultural Fest
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-white leading-tight">
            Cultural Team Registration & Squad Roster Portal
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Captains assemble verified squads from event registrations, confirm
            member eligibility, and manage stage lineups for UMANG 2026.
          </p>

          {/* Institutional Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-stone-300">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Inter-College Stages</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
              <Music className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Music, Dance & Drama</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Verified Gmail Access</span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full lg:w-72 flex flex-col gap-2.5 shrink-0">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-sm transition-colors text-center shadow-sm"
          >
            <span>Register a Team</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 font-medium text-sm border border-white/10 transition-colors text-center"
          >
            Captain Login
          </Link>

          <p className="text-[11px] text-stone-400 text-center pt-1">
            Registration requires source Google Form verification
          </p>
        </div>
      </div>
    </div>
  );
}
