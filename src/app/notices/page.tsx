"use client";

import { useState, useEffect } from "react";
import { Bell, Filter, Loader2 } from "lucide-react";
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
    const matchType =
      filterType === "all" || n.type.toLowerCase() === filterType.toLowerCase();
    const matchEvent =
      selectedEventId === "ALL" ||
      n.event_id === "ALL" ||
      n.event_id === selectedEventId;
    return matchType && matchEvent;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
            Official Bulletin Board
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight font-normal">
            Notices, Schedules & Results
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm mt-1">
            Stage line-ups, sound-check call times, guidelines, and competition results.
          </p>
        </div>

        <Link
          href="/register"
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium text-white bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm self-start sm:self-auto"
        >
          Register Team
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All updates" },
            { id: "notice", label: "Notices" },
            { id: "schedule", label: "Schedules" },
            { id: "result", label: "Results" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Filter Select */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 rounded-md border border-stone-300 text-xs font-medium bg-stone-50 focus:outline-none focus:border-[#831830]"
          >
            <option value="ALL">All events</option>
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
        <div className="flex items-center justify-center py-12 gap-2 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin text-[#831830]" />
          <span className="text-sm">Loading bulletin board...</span>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white rounded-lg p-10 text-center border border-stone-200 text-stone-500 space-y-1.5">
          <Bell className="w-6 h-6 text-stone-400 mx-auto" />
          <h3 className="font-medium text-stone-800 text-sm">No updates matching your filter</h3>
          <p className="text-xs text-stone-500">
            Check back later or change your category filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredNotices.map((notice) => {
            const isResult = notice.type.toLowerCase() === "result";
            const isSchedule = notice.type.toLowerCase() === "schedule";

            return (
              <div
                key={notice.notice_id}
                className={`bg-white rounded-lg p-5 sm:p-6 border shadow-sm transition-colors space-y-2.5 ${
                  isResult
                    ? "border-amber-300/80 bg-amber-50/20"
                    : "border-stone-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                        isResult
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : isSchedule
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-stone-100 text-stone-800 border border-stone-200"
                      }`}
                    >
                      {notice.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-stone-500">
                      Event: <strong className="font-medium text-stone-800">{notice.event_id}</strong>
                    </span>
                  </div>

                  <span className="text-xs text-stone-500 font-mono tabular-nums">
                    {new Date(notice.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-stone-900">
                  {notice.title}
                </h2>

                <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
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
