import Link from "next/link";
import { Mail, Shield, BookOpen, Users, LogIn } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1c1917] text-stone-400 border-t border-stone-800 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Fest & College Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#831830] flex items-center justify-center text-white font-serif font-bold text-sm">
                U
              </div>
              <span className="text-base font-semibold text-stone-100 tracking-tight">
                UMANG 2026
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 max-w-md leading-relaxed">
              Annual Cultural Festival of Motihari College of Engineering (MCE Motihari).
              Department of Science & Technology, Government of Bihar.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded bg-stone-800/80 text-stone-300 border border-stone-700/60">
                Music & Vocal
              </span>
              <span className="px-2 py-0.5 rounded bg-stone-800/80 text-stone-300 border border-stone-700/60">
                Choreography & Dance
              </span>
              <span className="px-2 py-0.5 rounded bg-stone-800/80 text-stone-300 border border-stone-700/60">
                Theatre & Skits
              </span>
              <span className="px-2 py-0.5 rounded bg-stone-800/80 text-stone-300 border border-stone-700/60">
                Fine Arts & Literary
              </span>
            </div>
          </div>

          {/* Registration Rules */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Registration Rules
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Individual Google Form entry is required before team assignment.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Captains receive their login password by Gmail upon submission.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Team rosters may be adjusted until the event registration deadline.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Team names must be unique within each competition.</span>
              </li>
            </ul>
          </div>

          {/* Portals & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Portals & Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/register"
                  className="hover:text-stone-200 transition-colors flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-stone-400" /> Register a team
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-stone-200 transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5 text-stone-400" /> Captain portal
                </Link>
              </li>
              <li>
                <Link
                  href="/notices"
                  className="hover:text-stone-200 transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-stone-400" /> Event notices & schedules
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="hover:text-stone-200 transition-colors flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-stone-400" /> Admin coordinator portal
                </Link>
              </li>
            </ul>
            <p className="pt-1 text-[11px] text-stone-500">
              For password reset issues, contact the event coordinator desk.
            </p>
          </div>
        </div>

        <div className="border-t border-stone-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 Motihari College of Engineering. All rights reserved.</p>
          <p className="font-mono text-[11px] text-stone-400">
            Powered by Google Sheets API
          </p>
        </div>
      </div>
    </footer>
  );
}
