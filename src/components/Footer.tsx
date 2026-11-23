import Link from "next/link";
import { Sparkles, Mail, ShieldAlert, BookOpen, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Fest & College Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-festive-maroon-700 flex items-center justify-center text-festive-gold-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xl font-extrabold tracking-wide text-white">
                UMANG 2026
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Annual Cultural Extravaganza of Motihari College of Engineering, Motihari.
              Established by the Department of Science & Technology, Government of Bihar.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Music & Bands
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Dance & Natraj
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Nukkad Natak
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Fine Arts & Literary
              </span>
            </div>
          </div>

          {/* Quick Registration Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-festive-gold-400">
              Registration Rules
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-festive-gold-400 font-bold">•</span>
                <span>Individual Google Form must be filled before team selection.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-festive-gold-400 font-bold">•</span>
                <span>Captains receive their login password by Gmail upon submission.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-festive-gold-400 font-bold">•</span>
                <span>Teams can only be edited before the event deadline.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-festive-gold-400 font-bold">•</span>
                <span>Team names must be unique within each event.</span>
              </li>
            </ul>
          </div>

          {/* Portal Links & Help */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-festive-gold-400">
              Portals & Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/register" className="hover:text-festive-gold-300 transition flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-festive-gold-400" /> Register a Team
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-festive-gold-300 transition flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-festive-gold-400" /> Captain Login
                </Link>
              </li>
              <li>
                <Link href="/notices" className="hover:text-festive-gold-300 transition flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-festive-gold-400" /> Event Notices & Schedules
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-festive-gold-300 transition flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-festive-gold-400" /> Admin Portal
                </Link>
              </li>
            </ul>
            <div className="pt-2 text-xs text-slate-500">
              Forgot password? Contact event coordinators or fest admin.
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Motihari College of Engineering (MCE). All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Powered by Google Apps Script & Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
