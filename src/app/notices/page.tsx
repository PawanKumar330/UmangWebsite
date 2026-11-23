"use client";

import { useState, useEffect } from "react";
import { Bell, Calendar, Trophy, Sparkles, Filter, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { callApi } from "@/lib/api";
import { Notice, EventItem } from "@/types";

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [noticesRes, eventsRes] = await Promise.all([
          callApi<Notice[]>({ action: "getNotices" }),
          callApi<EventItem[]>({ action: "getEvents" }),
        ]);

        if (noticesRes.ok && noticesRes.data) {
          setNotices(noticesRes.data);
        }
        if (eventsRes.ok && eventsRes.data) {
          setEvents(eventsRes.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter notices
  const filteredNotices = notices.filter((n) => {
    const matchType = filterType === "all" || n.type.toLowerCase() === filterType.toLowerCase();
    const matchEvent = selectedEventId === "ALL" || n.event_id === "ALL" || n.event_id === selectedEventId;
    return matchType && matchEvent;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-festive-saffron-100 text-festive-saffron-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5 text-festive-saffron-700" />
            Official Bulletin Board
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Notices, Schedule & Results
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Stay updated with event slots, rules, reporting schedules, and winner announcements.
          </p>
        </div>

        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-festive-maroon-700 hover:bg-festive-maroon-800 shadow-sm"
        >
          Register Team
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Updates" },
            { id: "notice", label: "Notices" },
            { id: "schedule", label: "Schedules" },
            { id: "result", label: "Results" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterType === tab.id
                  ? "bg-festive-maroon-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Filter Select */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700"
          >
            <option value="ALL">All Cultural Events</option>
            {events.map((evt) => (
              <option key={evt.event_id} value={evt.event_id}>
                {evt.event_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-festive-maroon-700" />
          <span className="text-sm">Loading bulletin board...</span>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
          <Bell className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No updates matching your filter</h3>
          <p className="text-xs text-slate-400">
            Check back later or change your event/category filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const isResult = notice.type.toLowerCase() === "result";
            const isSchedule = notice.type.toLowerCase() === "schedule";

            return (
              <div
                key={notice.notice_id}
                className={`bg-white rounded-3xl p-6 sm:p-7 border shadow-sm transition-all space-y-3 ${
                  isResult
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isResult
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : isSchedule
                          ? "bg-sky-100 text-sky-900 border border-sky-300"
                          : "bg-festive-maroon-100 text-festive-maroon-900 border border-festive-maroon-300"
                      }`}
                    >
                      {notice.type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Event: <strong className="text-slate-800">{notice.event_id}</strong>
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(notice.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {notice.title}
                </h2>

                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {notice.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
