"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Users,
  Search,
  UserCheck,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  X,
  Mail,
  Loader2,
  Info,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { EventItem, Student, TeamMember } from "@/types";

export default function RegisterTeamPage() {
  // Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Form states
  const [captainId, setCaptainId] = useState<string>("");
  const [captainEmailInput, setCaptainEmailInput] = useState<string>("");
  const [captainVerified, setCaptainVerified] = useState<Student | null>(null);
  const [captainVerifying, setCaptainVerifying] = useState<boolean>(false);
  const [captainError, setCaptainError] = useState<string>("");

  const [teamName, setTeamName] = useState<string>("");
  const [teammates, setTeammates] = useState<Student[]>([]);

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  // Submission states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [successData, setSuccessData] = useState<{
    team_id: string;
    team_name: string;
    event_name: string;
    captain_email: string;
    is_new_captain: boolean;
    message: string;
  } | null>(null);

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load Open Events on Mount
  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true);
      const res = await callApi<EventItem[]>({ action: "getEvents" });
      if (res.ok && res.data) {
        setEvents(res.data);
        if (res.data.length > 0) {
          setSelectedEventId(res.data[0].event_id);
        }
      } else {
        setEvents([]);
      }
      setLoadingEvents(false);
    }
    loadEvents();
  }, []);

  // When event changes, reset captain verification and teammates to ensure strictly event-scoped validation
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setCaptainVerified(null);
    setCaptainError("");
    setTeammates([]);
    setSearchQuery("");
    setSearchResults([]);
    setSubmitError("");
  };

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);

  // Verify Captain in Event's Source Sheet
  const handleVerifyCaptain = async () => {
    const trimmedId = captainId.trim();
    if (!trimmedId) {
      setCaptainError("Please enter your registered Roll Number or Email.");
      return;
    }
    if (!selectedEventId) {
      setCaptainError("Please select an event first.");
      return;
    }

    setCaptainVerifying(true);
    setCaptainError("");

    try {
      const res = await callApi<Student[]>({
        action: "searchStudents",
        event_id: selectedEventId,
        query: trimmedId,
      });

      if (res.ok && res.data && res.data.length > 0) {
        // Find exact match by roll or masked email match
        const exact = res.data.find(
          (s) =>
            s.roll.toLowerCase() === trimmedId.toLowerCase() ||
            s.name.toLowerCase() === trimmedId.toLowerCase()
        );
        const match = exact || res.data[0];

        setCaptainVerified({
          ...match,
          is_captain: true,
        });
        setCaptainError("");
      } else {
        setCaptainVerified(null);
        setCaptainError("You are not registered for this event. Fill the individual form first.");
      }
    } catch (err: any) {
      setCaptainError(err.message || "Failed to verify captain registration.");
    } finally {
      setCaptainVerifying(false);
    }
  };

  // Debounced search for teammates in selected event
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || !selectedEventId) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    setSearching(true);
    searchDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await callApi<Student[]>({
          action: "searchStudents",
          event_id: selectedEventId,
          query: searchQuery.trim(),
        });

        if (res.ok && res.data) {
          // Exclude captain and already added teammates
          const addedRolls = new Set([
            captainVerified ? captainVerified.roll.toLowerCase() : "",
            ...teammates.map((t) => t.roll.toLowerCase()),
          ]);

          const filtered = res.data.filter((s) => !addedRolls.has(s.roll.toLowerCase()));
          setSearchResults(filtered);
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, [searchQuery, selectedEventId, captainVerified, teammates]);

  // Add teammate from search
  const handleAddTeammate = (student: Student) => {
    if (!selectedEvent) return;

    const totalMembers = (captainVerified ? 1 : 0) + teammates.length + 1;
    if (totalMembers > selectedEvent.max_team_size) {
      setSearchError(`Maximum ${selectedEvent.max_team_size} members allowed for this event.`);
      return;
    }

    setTeammates([...teammates, student]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  const handleRemoveTeammate = (roll: string) => {
    setTeammates(teammates.filter((t) => t.roll !== roll));
  };

  // Submit Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!selectedEvent) {
      setSubmitError("Please choose an open event.");
      return;
    }

    if (!captainVerified) {
      setSubmitError("Please verify your captain identity first.");
      return;
    }

    if (!teamName.trim() || teamName.trim().length < 2) {
      setSubmitError("Please provide a valid team name (at least 2 characters).");
      return;
    }

    if (!captainEmailInput.trim() || !captainEmailInput.includes("@")) {
      setSubmitError("Please enter a valid Captain Email address so you can receive your login password.");
      return;
    }

    const currentTotal = 1 + teammates.length; // Captain + teammates
    if (currentTotal < selectedEvent.min_team_size) {
      setSubmitError(
        `This event requires at least ${selectedEvent.min_team_size} members. You currently have ${currentTotal}.`
      );
      return;
    }

    if (currentTotal > selectedEvent.max_team_size) {
      setSubmitError(
        `This event allows a maximum of ${selectedEvent.max_team_size} members. You currently have ${currentTotal}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const payloadMembers: TeamMember[] = [
        {
          name: captainVerified.name,
          roll: captainVerified.roll,
          branch: captainVerified.branch,
          is_captain: true,
        },
        ...teammates.map((t) => ({
          name: t.name,
          roll: t.roll,
          branch: t.branch,
          is_captain: false,
        })),
      ];

      const res = await callApi<{
        team_id: string;
        team_name: string;
        event_name: string;
        captain_email: string;
        is_new_captain: boolean;
        message: string;
      }>({
        action: "registerTeam",
        event_id: selectedEventId,
        captain_identifier: captainVerified.roll,
        captain_email: captainEmailInput.trim(),
        team_name: teamName.trim(),
        members: payloadMembers,
      });

      if (res.ok && res.data) {
        setSuccessData(res.data);
        // Trigger celebratory confetti!
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#be123c", "#f59e0b", "#fbbf24", "#ea580c"],
          });
        } catch (e) {}
      } else {
        setSubmitError(res.error || "Failed to register team. Please review all fields.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred during registration.");
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-festive-gold-300 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-festive-maroon-700 bg-festive-maroon-50 px-3 py-1 rounded-full border border-festive-maroon-200">
              Registration Successful
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Team Registered! 🎉
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
              {successData.message}
            </p>
          </div>

          {/* Registered Team Summary Card */}
          <div className="bg-festive-gold-50/50 border border-festive-gold-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center border-b border-festive-gold-200/80 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Team ID</span>
              <span className="font-mono font-bold text-festive-maroon-800 text-sm">
                {successData.team_id}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-festive-gold-200/80 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Team Name</span>
              <span className="font-bold text-slate-900 text-base">{successData.team_name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-festive-gold-200/80 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Event</span>
              <span className="font-medium text-slate-800 text-sm">{successData.event_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Captain Email</span>
              <span className="font-medium text-slate-800 text-sm">{successData.captain_email}</span>
            </div>
          </div>

          {/* Login prompt notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Check your Gmail inbox or spam folder</p>
              <p className="text-amber-800 mt-0.5">
                {successData.is_new_captain
                  ? "We have emailed your generated 8-character login password. Log in anytime to view or edit your squad before the deadline."
                  : "Confirmation has been sent to your email. You can log in using your existing captain password."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-festive-maroon-700 to-festive-saffron-600 hover:opacity-95 shadow-md shadow-festive-maroon-700/20"
            >
              Go to Captain Login <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                setSuccessData(null);
                setCaptainVerified(null);
                setCaptainId("");
                setTeamName("");
                setTeammates([]);
              }}
              className="px-6 py-3.5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Register Another Team
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCount = (captainVerified ? 1 : 0) + teammates.length;
  const minSize = selectedEvent?.min_team_size || 1;
  const maxSize = selectedEvent?.max_team_size || 10;
  const isSizeValid = currentCount >= minSize && currentCount <= maxSize;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-festive-maroon-100 text-festive-maroon-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-festive-maroon-700" />
          MCE Motihari Cultural Fest 2026
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Register a Cultural Team
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
          Captains must first fill the individual event form. Search and pick verified classmates
          for your event squad.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Select Event */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-festive-maroon-700 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              Select Cultural Event
            </label>
            {selectedEvent && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Registrations Open
              </span>
            )}
          </div>

          {loadingEvents ? (
            <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-festive-maroon-700" />
              <span>Loading open cultural events...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm border border-amber-200">
              No open events found right now. Check the notices page or contact fest coordinators.
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium bg-slate-50/50"
              >
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.event_name} (Team Size: {evt.min_team_size} - {evt.max_team_size})
                  </option>
                ))}
              </select>

              {selectedEvent && (
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl gap-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-festive-maroon-600" />
                    <span>
                      Required Squad Size:{" "}
                      <strong className="text-slate-900">
                        {selectedEvent.min_team_size} to {selectedEvent.max_team_size} members
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Deadline:{" "}
                      <strong className="text-slate-800">
                        {new Date(selectedEvent.deadline).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: Captain Verification */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-festive-maroon-700 text-white text-xs flex items-center justify-center font-bold">
              2
            </span>
            Captain Verification (Event Source Sheet)
          </label>

          <p className="text-xs text-slate-500">
            Enter the Roll Number or Email you used while filling the Google Form for this event.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="e.g. 21105128001 or email@domain.com"
                value={captainId}
                onChange={(e) => {
                  setCaptainId(e.target.value);
                  setCaptainVerified(null);
                  setCaptainError("");
                }}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
              />
            </div>

            <button
              type="button"
              onClick={handleVerifyCaptain}
              disabled={captainVerifying || !captainId.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white bg-slate-900 hover:bg-festive-maroon-800 transition disabled:opacity-50 text-sm"
            >
              {captainVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-festive-gold-300" /> Verify Captain
                </>
              )}
            </button>
          </div>

          {/* Captain Error Message */}
          {captainError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{captainError}</p>
                <p className="text-rose-700 text-xs mt-0.5">
                  Make sure you have filled the individual participant Google Form for{" "}
                  <strong>{selectedEvent?.event_name}</strong> and your roll number matches exactly.
                </p>
              </div>
            </div>
          )}

          {/* Captain Verified Card */}
          {captainVerified && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                    {captainVerified.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{captainVerified.name}</span>
                      <span className="text-[10px] font-bold uppercase bg-festive-maroon-700 text-white px-2 py-0.5 rounded-md">
                        Captain Verified
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">
                      Roll: <strong>{captainVerified.roll}</strong> • Branch: {captainVerified.branch}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              {/* Captain Email Input for receiving password */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <label className="text-xs font-bold uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-festive-maroon-700" />
                  Your Email Address (To Receive Team Login Password) *
                </label>
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={captainEmailInput}
                  onChange={(e) => setCaptainEmailInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium bg-white"
                  required
                />
                <p className="text-[11px] text-amber-800">
                  Your generated 8-character login password will be emailed to this address upon submitting the team.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: Team Details & Teammates */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-festive-maroon-700 text-white text-xs flex items-center justify-center font-bold">
              3
            </span>
            Team Details & Squad Selection
          </label>

          {/* Team Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              Team Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Rhythm Riders, The Champaran Grooves"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
              required
            />
            <p className="text-[11px] text-slate-500">
              Team name must be unique within this event (case-insensitive).
            </p>
          </div>

          {/* Teammate Search Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Search Teammates (This Event Only)
              </label>
              {selectedEvent && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    isSizeValid
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {currentCount} of {minSize}-{maxSize} Members
                </span>
              )}
            </div>

            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Type classmate's Roll Number or Name..."
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
                />
                {searching && (
                  <Loader2 className="w-4 h-4 animate-spin text-festive-maroon-700 absolute right-4 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Live Suggestions Dropdown */}
              {searchFocused && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {searching
                        ? "Searching event registrations..."
                        : "No matching registered students found in this event form."}
                    </div>
                  ) : (
                    searchResults.map((student) => (
                      <button
                        key={student.roll}
                        type="button"
                        onClick={() => handleAddTeammate(student)}
                        className="w-full text-left px-4 py-3 hover:bg-festive-maroon-50/60 flex items-center justify-between transition group"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900 group-hover:text-festive-maroon-800">
                            {student.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Roll: <span className="font-mono">{student.roll}</span> • {student.branch}{" "}
                            {student.email_masked && `• ${student.email_masked}`}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-festive-maroon-700 group-hover:bg-festive-maroon-700 group-hover:text-white px-2.5 py-1 rounded-lg border border-festive-maroon-200 transition">
                          + Add
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {searchError && (
              <p className="text-xs text-rose-600 font-medium">{searchError}</p>
            )}
          </div>

          {/* Members List (Squad Chips) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Current Squad ({currentCount} Members)
            </h4>

            {currentCount === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Verify captain identity above to begin adding teammates.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Captain Chip (Pinned) */}
                {captainVerified && (
                  <div className="p-3 rounded-2xl bg-festive-gold-50 border border-festive-gold-300 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-festive-maroon-700 text-white font-bold text-xs flex items-center justify-center">
                        C
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {captainVerified.name}
                          </span>
                          <span className="text-[10px] font-bold bg-festive-maroon-700 text-white px-1.5 py-0.2 rounded">
                            Captain
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {captainVerified.roll} • {captainVerified.branch}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Added Teammates */}
                {teammates.map((teammate) => (
                  <div
                    key={teammate.roll}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {teammate.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {teammate.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {teammate.roll} • {teammate.branch}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTeammate(teammate.roll)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove teammate"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submission Error Banner */}
        {submitError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Registration Incomplete</p>
              <p className="text-xs sm:text-sm mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={submitting || !captainVerified || !teamName.trim() || !isSizeValid}
          className="w-full py-4 rounded-2xl font-bold text-white text-base bg-gradient-to-r from-festive-maroon-700 via-festive-maroon-800 to-festive-saffron-600 hover:opacity-95 transition-all shadow-xl shadow-festive-maroon-800/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Registering Team with Apps Script...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-festive-gold-300" />
              Complete Team Registration
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Already registered a team?{" "}
          <Link href="/login" className="text-festive-maroon-700 font-bold hover:underline">
            Captain Login to Manage Squad
          </Link>
        </p>
      </form>
    </div>
  );
}
