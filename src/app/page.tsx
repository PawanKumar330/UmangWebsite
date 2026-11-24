import Link from "next/link";
import FestiveBanner from "@/components/FestiveBanner";
import {
  Users,
  Trophy,
  ArrowRight,
  Bell,
  Lock,
  ChevronRight,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { EventItem, Notice } from "@/types";

export const revalidate = 60; // Refresh events every 60s

export default async function HomePage() {
  let events: EventItem[] = [];

  try {
    const eventsRes = await callApi<EventItem[]>({ action: "getEvents" });
    if (eventsRes.ok && eventsRes.data) {
      events = eventsRes.data;
    }
  } catch (e) {
    // Graceful fallback for offline/preview
  }

  return (
    <div className="space-y-10">
      {/* Festive Hero Banner */}
      <FestiveBanner />

      {/* Primary Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/register"
          className="group bg-white rounded-lg p-6 border border-stone-200/80 shadow-sm hover:border-stone-400 transition-colors flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-md bg-[#fdf2f4] text-[#831830] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 pt-1">
              Register a Team
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              Select an event, verify captain eligibility from the Google Form responses, and assemble your squad roster.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-[#831830]">
            <span>Begin registration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/login"
          className="group bg-white rounded-lg p-6 border border-stone-200/80 shadow-sm hover:border-stone-400 transition-colors flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-md bg-[#faf8f2] text-amber-800 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 pt-1">
              Captain Portal
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              Log in with your Gmail credentials to view registered teams, replace or add eligible teammates before the deadline.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-amber-800">
            <span>Access squads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/notices"
          className="group bg-white rounded-lg p-6 border border-stone-200/80 shadow-sm hover:border-stone-400 transition-colors flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-md bg-stone-100 text-stone-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 pt-1">
              Notices & Schedule
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              Check stage schedules, call times, sound-check requirements, and official results published by the fest committee.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-stone-800">
            <span>View bulletin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </section>

      {/* Featured Open Events */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-stone-200 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#831830]" />
              Open Cultural Events
            </h2>
            <p className="text-stone-500 text-xs mt-0.5">
              Competitions actively accepting team roster submissions
            </p>
          </div>
          <Link
            href="/register"
            className="text-xs font-medium text-[#831830] hover:text-[#581020] inline-flex items-center gap-1"
          >
            All registrations <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg p-8 text-center text-stone-500 text-sm border border-stone-200">
              No open events listed at this moment.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.event_id}
                className="bg-white rounded-lg p-5 border border-stone-200 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                      Open
                    </span>
                    <span className="text-xs text-stone-500 font-mono tabular-nums">
                      {evt.min_team_size}–{evt.max_team_size} members
                    </span>
                  </div>
                  <h3 className="font-medium text-base text-stone-900 leading-snug">
                    {evt.event_name}
                  </h3>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="text-stone-500">
                    Deadline:{" "}
                    <span className="font-medium text-stone-800 tabular-nums">
                      {new Date(evt.deadline).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <Link
                    href={`/register`}
                    className="font-medium px-2.5 py-1 rounded bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Step-by-Step Procedure */}
      <section className="bg-[#1c1917] text-stone-200 rounded-xl p-6 sm:p-8 border border-stone-800 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider text-amber-400">
            Instructions
          </p>
          <h2 className="text-lg font-semibold text-white">How Team Registration Operates</h2>
          <p className="text-stone-400 text-xs sm:text-sm">
            Four disciplined steps ensure legitimate batch participation in UMANG 2026.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 space-y-2">
            <span className="inline-block px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-xs font-medium">
              Step 01
            </span>
            <h4 className="font-medium text-sm text-stone-100">Submit Google Form</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Every participant must individually register on the official competition form first.
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 space-y-2">
            <span className="inline-block px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-xs font-medium">
              Step 02
            </span>
            <h4 className="font-medium text-sm text-stone-100">Captain Verification</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Captain inputs their college roll number to authenticate registration in that event.
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 space-y-2">
            <span className="inline-block px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-xs font-medium">
              Step 03
            </span>
            <h4 className="font-medium text-sm text-stone-100">Select Teammates</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Search by name or roll number from verified entries to assemble within squad limits.
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 space-y-2">
            <span className="inline-block px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-xs font-medium">
              Step 04
            </span>
            <h4 className="font-medium text-sm text-stone-100">Credentials Emailed</h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              A private 8-character access password is automatically delivered to the captain’s Gmail.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
