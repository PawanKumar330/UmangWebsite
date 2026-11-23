import { Sparkles, Calendar, Trophy, Music, Flame, Award } from "lucide-react";
import Link from "next/link";

export default function FestiveBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-festive-maroon-950 via-festive-maroon-900 to-festive-saffron-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-festive-gold-500/30">
      {/* Decorative festive background accents */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-festive-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-festive-saffron-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating fest badges */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-festive-gold-500/20 text-festive-gold-300 border border-festive-gold-500/40 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Flame className="w-4 h-4 text-festive-gold-400 animate-pulse" />
            Annual Cultural Festival 2026
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Celebrate Talent at{" "}
            <span className="bg-gradient-to-r from-festive-gold-300 via-amber-200 to-festive-gold-400 bg-clip-text text-transparent">
              UMANG 2026
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Welcome to the official <strong>Event Team Registration Portal</strong> of{" "}
            <span className="text-white font-semibold">Motihari College of Engineering</span>.
            Captains can assemble their squads, select teammates from verified event registrations,
            and manage teams seamlessly.
          </p>

          {/* Key Feature highlights */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm text-festive-gold-200">
            <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
              <Trophy className="w-4 h-4 text-festive-gold-400" />
              <span>Inter-College Battles</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
              <Music className="w-4 h-4 text-festive-gold-400" />
              <span>Music, Dance, Drama</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
              <Award className="w-4 h-4 text-festive-gold-400" />
              <span>Instant Gmail Password</span>
            </div>
          </div>
        </div>

        {/* CTA Box */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-3">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-festive-gold-400 to-festive-gold-500 hover:from-festive-gold-300 hover:to-festive-gold-400 text-festive-maroon-950 font-bold text-sm sm:text-base shadow-xl shadow-festive-gold-500/20 transition-transform active:scale-95 text-center"
          >
            <Sparkles className="w-5 h-5 text-festive-maroon-900" />
            Register Your Team
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base border border-white/20 backdrop-blur-sm transition text-center"
          >
            Captain Login & Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
