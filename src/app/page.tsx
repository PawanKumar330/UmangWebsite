import Link from "next/link";
import FestiveBanner from "@/components/FestiveBanner";
import {
  Users,
  Calendar,
  Sparkles,
  Trophy,
  ArrowRight,
  Shield,
  Bell,
  CheckCircle,
  HelpCircle,
  Lock,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { EventItem, Notice } from "@/types";

export const revalidate = 60; // Refresh events every 60s

export default async function HomePage() {
  let events: EventItem[] = [];
  let notices: Notice[] = [];

  try {
    const eventsRes = await callApi<EventItem[]>({ action: "getEvents" });
    if (eventsRes.ok && eventsRes.data) {
      events = eventsRes.data;
    }
    const noticesRes = await callApi<Notice[]>({ action: "getNotices" });
    if (noticesRes.ok && noticesRes.data) {
      notices = noticesRes.data.slice(0, 3);
    }
  } catch (e) {
    // Graceful fallback
  }

  return (
    <div className="space-y-12">
      {/* Festive Hero Banner */}
      <FestiveBanner />

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/register"
          className="group relative overflow-hidden bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md hover:shadow-xl hover:border-festive-maroon-300 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-festive-maroon-50 text-festive-maroon-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-festive-maroon-800 transition">
            Register a Team
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Pick your cultural event, verify your registration from the Google Form, and invite classmates to your squad.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-festive-maroon-700">
            <span>Register Now</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/login"
          className="group relative overflow-hidden bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md hover:shadow-xl hover:border-festive-gold-400 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-festive-gold-50 text-festive-gold-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6 text-amber-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-amber-800 transition">
            Captain Login
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Log in with the password sent to your Gmail upon registration to view your squads and modify teammates before the deadline.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <span>Access Portal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/notices"
          className="group relative overflow-hidden bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md hover:shadow-xl hover:border-festive-saffron-300 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-festive-saffron-50 text-festive-saffron-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-festive-saffron-800 transition">
            Notices & Schedule
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Track stage line-ups, sound check slots, rules, updates, and fest results published directly by the fest organizing team.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-festive-saffron-700">
            <span>View Board</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Featured Open Events */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-festive-maroon-700" />
              Open Cultural Events
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Current active events accepting team registrations
            </p>
          </div>
          <Link
            href="/register"
            className="text-xs sm:text-sm font-bold text-festive-maroon-700 hover:text-festive-maroon-800 inline-flex items-center gap-1"
          >
            Start Registration <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-200">
              No open events listed at this moment.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.event_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Open Now
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {evt.min_team_size}-{evt.max_team_size} Members
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {evt.event_name}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Deadline:{" "}
                    <strong className="text-slate-700">
                      {new Date(evt.deadline).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </strong>
                  </div>
                  <Link
                    href={`/register`}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-festive-maroon-50 text-festive-maroon-700 hover:bg-festive-maroon-700 hover:text-white transition"
                  >
                    Register Team
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* How it Works / Instructions */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-10 shadow-lg space-y-6">
        <div className="max-w-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-festive-gold-400">
            Step-by-step
          </span>
          <h2 className="text-2xl font-bold mt-1">How Registration Works</h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Follow these 4 simple steps to represent your batch in UMANG 2026:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-festive-maroon-600 text-white font-bold text-sm flex items-center justify-center">
              1
            </div>
            <h4 className="font-bold text-sm text-white">Fill Event Google Form</h4>
            <p className="text-xs text-slate-300">
              Every student who wants to participate must first fill the individual event Google Form.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-festive-gold-500 text-slate-950 font-bold text-sm flex items-center justify-center">
              2
            </div>
            <h4 className="font-bold text-sm text-white">Captain Enters Roll No</h4>
            <p className="text-xs text-slate-300">
              The team captain verifies their individual registration for the selected event.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-festive-saffron-500 text-white font-bold text-sm flex items-center justify-center">
              3
            </div>
            <h4 className="font-bold text-sm text-white">Pick Verified Teammates</h4>
            <p className="text-xs text-slate-300">
              Search by roll number or name from that event's sheet and form your squad within min/max limits.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-sm flex items-center justify-center">
              4
            </div>
            <h4 className="font-bold text-sm text-white">Password via Gmail</h4>
            <p className="text-xs text-slate-300">
              Captain receives a generated login password in their Gmail to log in and manage the team.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
