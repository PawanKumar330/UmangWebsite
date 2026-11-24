"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Users,
  Search,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  X,
  Mail,
  Loader2,
  Send,
  KeyRound,
  RefreshCw,
  Check,
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

  // Gmail Test & Confirmation states
  const [emailOtpSent, setEmailOtpSent] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>("");
  const [emailSendingOtp, setEmailSendingOtp] = useState<boolean>(false);
  const [emailVerifyingOtp, setEmailVerifyingOtp] = useState<boolean>(false);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState<boolean>(false);
  const [emailVerificationMsg, setEmailVerificationMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

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

  // Countdown timer for resending test OTP code
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // When event changes, reset captain verification, teammates, and email confirmation
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setCaptainVerified(null);
    setCaptainError("");
    setTeammates([]);
    setSearchQuery("");
    setSearchResults([]);
    setSubmitError("");
    setIsEmailConfirmed(false);
    setEmailOtpSent(false);
    setEmailOtpCode("");
    setEmailVerificationMsg(null);
    setResendCooldown(0);
  };

  const handleEmailChange = (val: string) => {
    setCaptainEmailInput(val);
    if (isEmailConfirmed || emailOtpSent) {
      setIsEmailConfirmed(false);
      setEmailOtpSent(false);
      setEmailOtpCode("");
      setEmailVerificationMsg(null);
      setResendCooldown(0);
    }
  };

  const handleSendTestEmail = async () => {
    const trimmed = captainEmailInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setEmailVerificationMsg({
        type: "error",
        text: "Please enter a valid Gmail address (e.g. name@gmail.com).",
      });
      return;
    }

    setEmailSendingOtp(true);
    setEmailVerificationMsg(null);

    try {
      const res = await callApi<{ message: string }>({
        action: "sendCaptainEmailVerification",
        email: trimmed,
        captain_name: captainVerified?.name || "Captain",
        event_name: selectedEvent?.event_name || "Cultural Fest",
      });

      if (res.ok) {
        setEmailOtpSent(true);
        setResendCooldown(60);
        setEmailVerificationMsg({
          type: "success",
          text:
            res.data?.message ||
            `Test confirmation code sent to ${trimmed}. Please check your Inbox or Spam folder.`,
        });
      } else {
        const errorText = res.error || "Failed to send test email.";
        const isUnknownAction = errorText.includes("Unknown action");
        setEmailVerificationMsg({
          type: "error",
          text: isUnknownAction
            ? "Your Google Apps Script Web App is running an older version. In Apps Script, click Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy."
            : errorText,
        });
      }
    } catch (err: any) {
      setEmailVerificationMsg({
        type: "error",
        text: err.message || "Network error while sending test email.",
      });
    } finally {
      setEmailSendingOtp(false);
    }
  };

  const handleConfirmEmailCode = async () => {
    const trimmed = captainEmailInput.trim();
    const code = emailOtpCode.trim();
    if (!code || code.length < 4) {
      setEmailVerificationMsg({
        type: "error",
        text: "Please enter the 6-digit confirmation code received in your Gmail.",
      });
      return;
    }

    setEmailVerifyingOtp(true);
    setEmailVerificationMsg(null);

    try {
      const res = await callApi<{ verified: boolean; message: string }>({
        action: "verifyCaptainEmailCode",
        email: trimmed,
        code: code,
      });

      if (res.ok && res.data?.verified) {
        setIsEmailConfirmed(true);
        setEmailVerificationMsg({
          type: "success",
          text: "Gmail address confirmed successfully. You will receive your team credentials here.",
        });
      } else {
        setEmailVerificationMsg({
          type: "error",
          text: res.error || res.data?.message || "Invalid or expired confirmation code.",
        });
      }
    } catch (err: any) {
      setEmailVerificationMsg({
        type: "error",
        text: err.message || "Failed to verify confirmation code.",
      });
    } finally {
      setEmailVerifyingOtp(false);
    }
  };

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);

  // Verify Captain in Event's Source Sheet
  const handleVerifyCaptain = async () => {
    const trimmedId = captainId.trim();
    if (!trimmedId) {
      setCaptainError("Please enter your registered roll number or email.");
      return;
    }

    if (!selectedEvent) {
      setCaptainError("Please select a cultural event first.");
      return;
    }

    setCaptainVerifying(true);
    setCaptainError("");

    try {
      const res = await callApi<{ found: boolean; student: Student }>({
        action: "verifyCaptain",
        event_id: selectedEventId,
        identifier: trimmedId,
      });

      if (res.ok && res.data && res.data.found) {
        setCaptainVerified(res.data.student);
      } else {
        setCaptainVerified(null);
        setCaptainError(
          res.error ||
            "Participant not found in the Google Form submissions for this event. Ensure you filled the individual participant form."
        );
      }
    } catch (err: any) {
      setCaptainVerified(null);
      setCaptainError(err.message || "Unable to reach verification service.");
    } finally {
      setCaptainVerifying(false);
    }
  };

  // Debounced search for teammates in event's sheet
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
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
          const addedRolls = new Set([
            ...(captainVerified ? [captainVerified.roll.toLowerCase()] : []),
            ...teammates.map((t) => t.roll.toLowerCase()),
          ]);

          const filtered = res.data.filter(
            (s) => !addedRolls.has(s.roll.toLowerCase())
          );
          setSearchResults(filtered);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, [searchQuery, selectedEventId, teammates, captainVerified]);

  const handleAddTeammate = (student: Student) => {
    const maxSize = Number(selectedEvent?.max_team_size) || 10;
    const currentTotal = 1 + teammates.length;

    if (currentTotal >= maxSize) {
      setSearchError(`Maximum squad size of ${maxSize} members reached.`);
      return;
    }

    setTeammates([...teammates, student]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!captainEmailInput.trim() || !emailRegex.test(captainEmailInput.trim())) {
      setSubmitError("Please enter a valid Gmail address to receive your password.");
      return;
    }

    const minSize = Number(selectedEvent.min_team_size) || 1;
    const maxSize = Number(selectedEvent.max_team_size) || 10;
    const currentTotal = 1 + teammates.length;

    if (currentTotal < minSize) {
      setSubmitError(
        `This event requires at least ${minSize} members. You currently have ${currentTotal}. Please add ${minSize - currentTotal} more teammate(s).`
      );
      return;
    }

    if (currentTotal > maxSize) {
      setSubmitError(
        `This event allows a maximum of ${maxSize} members. You currently have ${currentTotal}.`
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
        try {
          confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.6 },
            colors: ["#831830", "#b45309", "#44403c"],
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

  // SUCCESS CONFIRMATION VIEW
  if (successData) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-stone-200 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
              Registration Confirmed
            </span>
            <h2 className="text-xl sm:text-2xl font-serif text-stone-900 font-normal">
              Team Roster Submitted
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
              {successData.message}
            </p>
          </div>

          {/* Registered Team Summary Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-md p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <span className="text-stone-500 font-medium">Team ID</span>
              <span className="font-mono font-medium text-stone-900 tabular-nums">
                {successData.team_id}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <span className="text-stone-500 font-medium">Team Name</span>
              <span className="font-medium text-stone-900">{successData.team_name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <span className="text-stone-500 font-medium">Event</span>
              <span className="text-stone-800">{successData.event_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Captain Email</span>
              <span className="text-stone-800 font-mono">{successData.captain_email}</span>
            </div>
          </div>

          {/* Email notice */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-3.5 text-xs text-amber-900 flex items-start gap-2.5 text-left">
            <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium">Check your Gmail inbox</p>
              <p className="text-amber-800 leading-relaxed">
                {successData.is_new_captain
                  ? "Your 8-character password has been delivered to your email. Use it to log in and manage your roster before the deadline."
                  : "Confirmation has been emailed. Log in using your existing captain credentials."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md font-medium text-white text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm"
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
                setIsEmailConfirmed(false);
              }}
              className="px-4 py-2.5 rounded-md font-medium text-xs sm:text-sm text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
            >
              Register Another Team
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCount = (captainVerified ? 1 : 0) + teammates.length;
  const minSize = Number(selectedEvent?.min_team_size) || 1;
  const maxSize = Number(selectedEvent?.max_team_size) || 10;
  const isSizeValid = currentCount >= minSize && currentCount <= maxSize;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="space-y-1.5 border-b border-stone-200 pb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-stone-500">
          Cultural Fest Roster Entry
        </p>
        <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight font-normal">
          Register a Cultural Team
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          Captains verify individual Google Form submissions, confirm squad size, and register teammates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* STEP 1: Select Event */}
        <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-stone-900 text-white text-xs font-mono flex items-center justify-center font-medium">
                1
              </span>
              Select Cultural Event
            </label>
            {selectedEvent && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Open
              </span>
            )}
          </div>

          {loadingEvents ? (
            <div className="flex items-center justify-center py-6 text-stone-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#831830]" />
              <span className="text-xs">Loading open cultural events...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="p-3.5 rounded-md bg-amber-50 text-amber-900 text-xs border border-amber-200">
              No open events found right now. Check the notices board or contact the coordinators.
            </div>
          ) : (
            <div className="space-y-2.5">
              <select
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900 bg-stone-50/50"
              >
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.event_name} ({evt.min_team_size}–{evt.max_team_size} members)
                  </option>
                ))}
              </select>

              {selectedEvent && (
                <div className="flex flex-wrap items-center justify-between text-xs text-stone-600 bg-stone-50 p-2.5 rounded-md border border-stone-200/80 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    <span>
                      Squad limits:{" "}
                      <strong className="font-medium text-stone-900 tabular-nums">
                        {selectedEvent.min_team_size} to {selectedEvent.max_team_size} members
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>
                      Deadline:{" "}
                      <strong className="font-medium text-stone-900 tabular-nums">
                        {new Date(selectedEvent.deadline).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
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
        <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border border-stone-200 space-y-4">
          <label className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-stone-900 text-white text-xs font-mono flex items-center justify-center font-medium">
              2
            </span>
            Captain Identity Verification
          </label>

          <p className="text-xs text-stone-500">
            Enter the roll number or email used on the event's Google Form.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Roll number or email"
                value={captainId}
                onChange={(e) => {
                  setCaptainId(e.target.value);
                  setCaptainVerified(null);
                  setCaptainError("");
                }}
                className="w-full px-3.5 py-2.5 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900 placeholder:text-stone-400"
              />
            </div>

            <button
              type="button"
              onClick={handleVerifyCaptain}
              disabled={captainVerifying || !captainId.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md font-medium text-white bg-stone-900 hover:bg-stone-800 transition-colors disabled:opacity-50 text-xs sm:text-sm shrink-0"
            >
              {captainVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-stone-300" /> Verify Captain
                </>
              )}
            </button>
          </div>

          {/* Captain Error */}
          {captainError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{captainError}</p>
                <p className="text-rose-700 mt-0.5">
                  Confirm that you submitted the individual participant form for{" "}
                  <strong>{selectedEvent?.event_name}</strong> with this exact roll number.
                </p>
              </div>
            </div>
          )}

          {/* Captain Verified Card */}
          {captainVerified && (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {captainVerified.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-stone-900 text-sm">
                        {captainVerified.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Verified
                      </span>
                    </div>
                    <p className="text-stone-600 font-mono text-[11px]">
                      Roll: {captainVerified.roll} • {captainVerified.branch}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              {/* Captain Email Confirmation */}
              <div className="space-y-3 p-3.5 sm:p-4 rounded-md bg-stone-50 border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-medium text-stone-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-500" />
                    Captain Gmail address (Live test delivery)
                  </label>
                  {isEmailConfirmed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Confirmed
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                      Confirmation required
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={captainEmailInput}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={isEmailConfirmed}
                    className={`flex-1 px-3 py-2 rounded-md border text-xs sm:text-sm ${
                      isEmailConfirmed
                        ? "bg-emerald-50/50 border-emerald-300 text-stone-900"
                        : "bg-white border-stone-300 text-stone-900 focus:outline-none focus:border-[#831830]"
                    }`}
                    required
                  />

                  {!isEmailConfirmed ? (
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={emailSendingOtp || !captainEmailInput.trim() || resendCooldown > 0}
                      className="px-3.5 py-2 rounded-md font-medium text-xs text-white bg-[#831830] hover:bg-[#6e192c] transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {emailSendingOtp ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>Resend in {resendCooldown}s</>
                      ) : emailOtpSent ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" /> Resend code
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-amber-200" /> Send test code
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailConfirmed(false);
                        setEmailOtpSent(false);
                        setEmailOtpCode("");
                        setEmailVerificationMsg(null);
                        setResendCooldown(0);
                      }}
                      className="px-3 py-2 rounded-md text-xs font-medium text-stone-700 bg-stone-200 hover:bg-stone-300 transition-colors"
                    >
                      Change email
                    </button>
                  )}
                </div>

                {/* OTP Code Entry Card */}
                {emailOtpSent && !isEmailConfirmed && (
                  <div className="p-3 rounded-md bg-white border border-stone-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-stone-800 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-stone-600" />
                        Enter 6-digit confirmation code from Gmail
                      </label>
                      <span className="text-[11px] text-stone-400">Valid 15m</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full sm:w-36 px-3 py-1.5 rounded-md border border-stone-300 text-center font-mono text-base font-semibold tracking-widest focus:outline-none focus:border-[#831830] bg-stone-50"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmEmailCode}
                        disabled={emailVerifyingOtp || emailOtpCode.trim().length < 6}
                        className="flex-1 py-1.5 px-3 rounded-md font-medium text-xs text-white bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {emailVerifyingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> Confirm code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Message */}
                {emailVerificationMsg && (
                  <div
                    className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                      emailVerificationMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        : "bg-rose-50 text-rose-900 border border-rose-200"
                    }`}
                  >
                    {emailVerificationMsg.type === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{emailVerificationMsg.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: Team Details & Squad Selection */}
        <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border border-stone-200 space-y-5">
          <label className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-stone-900 text-white text-xs font-mono flex items-center justify-center font-medium">
              3
            </span>
            Team Details & Squad Assembly
          </label>

          {/* Team Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">
              Team name *
            </label>
            <input
              type="text"
              placeholder="e.g. Rhythm Riders"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
              required
            />
            <p className="text-[11px] text-stone-500">
              Team name must be unique within this competition.
            </p>
          </div>

          {/* Teammate Search Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-700">
                Search verified participants
              </label>
              {selectedEvent && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    isSizeValid
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isSizeValid
                    ? `Squad count: ${currentCount} (${minSize}–${maxSize})`
                    : `${currentCount} / ${minSize}–${maxSize} members ${
                        currentCount < minSize ? `(need ${minSize - currentCount} more)` : `(max ${maxSize})`
                      }`}
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Type classmate's roll number or name..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
              />
              {searching && (
                <Loader2 className="w-4 h-4 animate-spin text-stone-500 absolute right-3 top-1/2 -translate-y-1/2" />
              )}

              {/* Live Suggestions Dropdown */}
              {searchFocused && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-md shadow-lg border border-stone-200 z-30 max-h-56 overflow-y-auto divide-y divide-stone-100">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-stone-500">
                      {searching
                        ? "Searching event submissions..."
                        : "No matching registered students found for this event."}
                    </div>
                  ) : (
                    searchResults.map((student) => (
                      <button
                        key={student.roll}
                        type="button"
                        onClick={() => handleAddTeammate(student)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-medium text-xs sm:text-sm text-stone-900">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            Roll: {student.roll} • {student.branch}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[#831830] bg-[#fdf2f4] px-2 py-0.5 rounded border border-[#f2a4b2]">
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

          {/* Members List */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-medium text-stone-600">
              Current Squad ({currentCount} members)
            </h4>

            {currentCount === 0 ? (
              <div className="p-4 text-center border border-dashed border-stone-200 rounded-md text-stone-400 text-xs">
                Verify captain identity above to begin assembling teammates.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Captain Chip */}
                {captainVerified && (
                  <div className="p-2.5 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-stone-900 text-white font-mono font-medium text-xs flex items-center justify-center">
                        C
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-stone-900 text-xs">
                            {captainVerified.name}
                          </span>
                          <span className="text-[10px] font-mono px-1 py-0.1 rounded bg-stone-200 text-stone-700">
                            Captain
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {captainVerified.roll} • {captainVerified.branch}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teammates */}
                {teammates.map((teammate) => (
                  <div
                    key={teammate.roll}
                    className="p-2.5 rounded-md bg-white border border-stone-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-stone-100 text-stone-700 font-mono text-xs flex items-center justify-center">
                        {teammate.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-stone-900 text-xs">
                          {teammate.name}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {teammate.roll} • {teammate.branch}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTeammate(teammate.roll)}
                      className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove teammate"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Registration incomplete</p>
              <p className="mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            submitting ||
            !captainVerified ||
            !teamName.trim() ||
            !isEmailConfirmed ||
            !isSizeValid
          }
          className="w-full py-3 rounded-md font-medium text-white text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting squad roster...
            </>
          ) : (
            "Complete Team Registration"
          )}
        </button>

        {!isEmailConfirmed && captainVerified && (
          <p className="text-center text-xs text-amber-800 font-medium">
            Please confirm your Gmail address above by entering the 6-digit test code before submitting.
          </p>
        )}

        <p className="text-center text-xs text-stone-500">
          Already registered a team?{" "}
          <Link href="/login" className="text-[#831830] font-medium hover:underline">
            Captain login
          </Link>
        </p>
      </form>
    </div>
  );
}
