"use client";

import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ChevronDown,
  Mail,
  Send,
  KeyRound,
  RefreshCw,
  Check,
  Sparkles,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { EventItem, Student, TeamMember } from "@/types";

export default function RegisterTeamPage() {
  // Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("");
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
    sub_category?: string;
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

  // When event changes, reset captain verification, category, teammates, and email confirmation
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedSubCategory("");
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

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);

  // Extract available sub-categories for selected event (e.g. Quiz, Crossword, Both)
  const availableSubCategories: string[] = selectedEvent?.sub_categories
    ? Array.isArray(selectedEvent.sub_categories)
      ? selectedEvent.sub_categories
      : String(selectedEvent.sub_categories)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
    : [];

  // Verify Captain in Event's Source Sheet & Check Existing Registrations
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
      // 1. Try verifyCaptain action first (checks both source sheet existence AND duplicates)
      let res = await callApi<any>({
        action: "verifyCaptain",
        event_id: selectedEventId,
        identifier: trimmedId,
      });

      // 2. Fallback to searchStudents if verifyCaptain is unrecognized on older backend
      if (!res.ok && res.error && res.error.includes("Unknown action")) {
        res = await callApi<Student[]>({
          action: "searchStudents",
          event_id: selectedEventId,
          query: trimmedId,
        });
      }

      if (res.ok && res.data) {
        let student: Student | null = null;
        if (res.data.student) {
          student = res.data.student;
        } else if (Array.isArray(res.data) && res.data.length > 0) {
          const exact = res.data.find(
            (s: Student) =>
              s.roll.toLowerCase() === trimmedId.toLowerCase() ||
              s.name.toLowerCase() === trimmedId.toLowerCase()
          );
          student = exact || res.data[0];
        }

        if (student) {
          // Check if student was flagged as already registered
          if (student.already_registered) {
            setCaptainVerified(null);
            setCaptainError(
              `You (${student.name}, Roll: ${student.roll}) are already registered in team '${student.registered_team}' for this event. A participant can join or lead only one team per event.`
            );
            return;
          }

          setCaptainVerified({
            ...student,
            is_captain: true,
          });
          setCaptainError("");

          // If student has a participation choice from the Form, auto-suggest or select it
          if (student.participation && availableSubCategories.length > 0) {
            const matchedCategory = availableSubCategories.find(
              (sc) => sc.toLowerCase() === student!.participation!.toLowerCase()
            );
            if (matchedCategory && !selectedSubCategory) {
              setSelectedSubCategory(matchedCategory);
            }
          }
        } else {
          setCaptainVerified(null);
          setCaptainError(
            "Participant not found in individual form for this event. Fill the individual form first."
          );
        }
      } else {
        setCaptainVerified(null);
        setCaptainError(
          res.error ||
            "Participant not found in individual form for this event. Ensure you submitted the individual participant form."
        );
      }
    } catch (err: any) {
      setCaptainVerified(null);
      setCaptainError(err.message || "Failed to verify captain registration.");
    } finally {
      setCaptainVerifying(false);
    }
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
            `Test confirmation code sent to ${trimmed}! Please check your Inbox or Spam folder.`,
        });
      } else {
        const errorText = res.error || "Failed to send test email.";
        const isUnknownAction = errorText.includes("Unknown action");
        setEmailVerificationMsg({
          type: "error",
          text: isUnknownAction
            ? "Your Google Apps Script Web App is running an older version. In Apps Script, click Deploy > Manage deployments > Edit > Version: New version > Deploy."
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
          text: "Gmail Confirmed! Your test email was delivered successfully. You can now complete your team registration.",
        });
      } else {
        setEmailVerificationMsg({
          type: "error",
          text: res.error || "Incorrect confirmation code. Please check your Gmail message and try again.",
        });
      }
    } catch (err: any) {
      setEmailVerificationMsg({
        type: "error",
        text: err.message || "Network error while verifying code.",
      });
    } finally {
      setEmailVerifyingOtp(false);
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

  const handleAddTeammate = (student: Student) => {
    if (!selectedEvent) return;

    if (student.already_registered) {
      setSearchError(
        `${student.name} (Roll: ${student.roll}) is already registered in team '${student.registered_team}' for this event.`
      );
      return;
    }

    const currentMax = Number(selectedEvent.max_team_size) || 10;
    const totalMembers = (captainVerified ? 1 : 0) + teammates.length + 1;
    if (totalMembers > currentMax) {
      setSearchError(`Maximum ${currentMax} members allowed for this event.`);
      return;
    }

    setTeammates([...teammates, student]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchFocused(false);
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

    // Validate internal sub-category choice if event has options
    if (availableSubCategories.length > 0 && !selectedSubCategory) {
      setSubmitError(
        `Please choose your participation category (${availableSubCategories.join(", ")}).`
      );
      return;
    }

    if (!teamName.trim() || teamName.trim().length < 2) {
      setSubmitError("Please provide a valid team name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!captainEmailInput.trim() || !emailRegex.test(captainEmailInput.trim())) {
      setSubmitError("Please enter a valid Captain Email address (e.g. name@gmail.com).");
      return;
    }

    if (!isEmailConfirmed) {
      setSubmitError("Please confirm your Gmail address first. Click 'Deliver Test Gmail' and enter the 6-digit confirmation code.");
      return;
    }

    const minSize = Number(selectedEvent.min_team_size) || 1;
    const maxSize = Number(selectedEvent.max_team_size) || 10;
    const currentTotal = 1 + teammates.length;

    if (currentTotal < minSize) {
      setSubmitError(
        `This event requires at least ${minSize} members (including captain). You currently have ${currentTotal}. Please add ${minSize - currentTotal} more teammate(s).`
      );
      return;
    }

    if (currentTotal > maxSize) {
      setSubmitError(
        `This event allows a maximum of ${maxSize} members (including captain). You currently have ${currentTotal}.`
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
          participation: captainVerified.participation,
        },
        ...teammates.map((t) => ({
          name: t.name,
          roll: t.roll,
          branch: t.branch,
          is_captain: false,
          participation: t.participation,
        })),
      ];

      const res = await callApi<{
        team_id: string;
        team_name: string;
        event_name: string;
        captain_email: string;
        is_new_captain: boolean;
        message: string;
        sub_category?: string;
      }>({
        action: "registerTeam",
        event_id: selectedEventId,
        captain_identifier: captainVerified.roll,
        captain_email: captainEmailInput.trim(),
        verification_code: emailOtpCode.trim(),
        team_name: teamName.trim(),
        members: payloadMembers,
        sub_category: selectedSubCategory,
      });

      if (res.ok && res.data) {
        setSuccessData(res.data);
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#9B1B3A", "#2563EB", "#059669", "#f59e0b"],
          });
        } catch (e) {}
      } else {
        setSubmitError(res.error || "Failed to register team. Please review all fields.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Network error. Please try submitting again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setSelectedSubCategory("");
    setTeamName("");
    setTeammates([]);
    setCaptainVerified(null);
    setCaptainId("");
    setCaptainEmailInput("");
    setIsEmailConfirmed(false);
    setEmailOtpSent(false);
    setEmailOtpCode("");
    setSubmitError("");
    setEmailVerificationMsg(null);
  };

  const currentCount = (captainVerified ? 1 : 0) + teammates.length;
  const minSize = Number(selectedEvent?.min_team_size) || 1;
  const maxSize = Number(selectedEvent?.max_team_size) || 10;
  const isSizeValid = currentCount >= minSize && currentCount <= maxSize;

  const formattedDeadline = selectedEvent?.deadline
    ? new Date(selectedEvent.deadline).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
    : "Event Registration Open";

  // SUCCESS SCREEN
  if (successData) {
    return (
      <div className="w-full max-w-[480px] md:max-w-[620px] mx-auto px-5 py-8 animate-in fade-in">
        <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-6 sm:p-8 space-y-6 text-center shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Registration Successful!
            </h2>
            <p className="text-sm text-gray-500">
              Team <strong>{successData.team_name}</strong> has been registered for{" "}
              <strong>{successData.event_name}</strong>.
            </p>
          </div>

          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500">Team ID:</span>
              <span className="font-mono font-bold text-gray-900">{successData.team_id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500">Event:</span>
              <span className="font-semibold text-gray-900">{successData.event_name}</span>
            </div>
            {successData.sub_category && (
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Category / Competition:</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {successData.sub_category}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500">Captain Email:</span>
              <span className="font-medium text-gray-900">{successData.captain_email}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Status:</span>
              <span className="font-bold text-emerald-600">Registered</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-[10px] text-xs text-emerald-800 text-left">
            <p className="font-semibold">Check your Gmail inbox:</p>
            <p className="mt-0.5">{successData.message}</p>
          </div>

          <button
            onClick={handleResetForm}
            className="w-full h-12 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-[10px] transition-colors"
          >
            Register Another Team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px] md:max-w-[620px] mx-auto px-5 py-4">
      {/* Title Section */}
      <section className="mt-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Register your team
        </h1>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Captains must verify first, then add verified teammates.
        </p>
      </section>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Event Selection Section */}
        <div className="space-y-1.5" data-purpose="event-selection">
          <label className="block text-sm font-medium text-gray-700" htmlFor="event-select">
            Event
          </label>
          <div className="relative">
            <select
              id="event-select"
              name="event"
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              disabled={loadingEvents}
              className="w-full h-12 px-3.5 pr-10 text-base bg-white border border-[#E5E7EB] rounded-[10px] text-gray-900 focus:border-[#9B1B3A] focus:ring-1 focus:ring-[#9B1B3A] outline-none transition-colors appearance-none"
            >
              {events.map((evt) => (
                <option key={evt.event_id} value={evt.event_id}>
                  {evt.event_name} (Team Size: {evt.min_team_size}–{evt.max_team_size})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          {selectedEvent && (
            <p className="text-xs text-gray-500 pt-0.5">
              {minSize}–{maxSize} members · Closes {formattedDeadline}
            </p>
          )}

          {/* Internal Category / Competition Choice (Shown when event has choices like Quiz, Crossword, Both) */}
          {availableSubCategories.length > 0 && (
            <div className="space-y-2 p-3.5 sm:p-4 rounded-[12px] bg-blue-50/60 border border-blue-200/80 mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                  Select Competition Category *
                </label>
                {captainVerified?.participation && (
                  <span className="text-[11px] font-medium text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full self-start sm:self-auto border border-blue-200">
                    Your Form Entry: <strong>{captainVerified.participation}</strong>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-600">
                This event accepts registrations for multiple competitions. Select what your team is registering for:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {availableSubCategories.map((choice) => {
                  const isSelected = selectedSubCategory === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setSelectedSubCategory(choice)}
                      className={`px-3 py-2.5 rounded-[8px] text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs ring-2 ring-[#2563EB]/25"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50/40"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{choice}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Captain Verification Section */}
        <div className="space-y-2" data-purpose="captain-verification">
          <label className="block text-sm font-medium text-gray-700" htmlFor="captain-id">
            Your Roll No. or Email
          </label>
          <div className="flex gap-2">
            <input
              id="captain-id"
              name="captain-id"
              type="text"
              placeholder="Enter Roll No. or Email"
              value={captainId}
              onChange={(e) => {
                setCaptainId(e.target.value);
                setCaptainVerified(null);
                setCaptainError("");
              }}
              className="flex-1 h-12 px-3.5 text-base border border-[#E5E7EB] rounded-[10px] text-gray-900 focus:border-[#9B1B3A] focus:ring-1 focus:ring-[#9B1B3A] outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleVerifyCaptain}
              disabled={captainVerifying || !captainId.trim()}
              className="h-12 px-5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-[10px] transition-colors focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {captainVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying
                </>
              ) : (
                "Verify"
              )}
            </button>
          </div>

          {/* Captain Verified Feedback */}
          {captainVerified && (
            <div className="flex items-center gap-1.5 pt-0.5 text-xs text-emerald-700 font-medium flex-wrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Verified: <strong>{captainVerified.name}</strong> ({captainVerified.branch}
                {captainVerified.roll ? ` · ${captainVerified.roll}` : ""})
              </span>
              {captainVerified.participation && (
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                  Form: {captainVerified.participation}
                </span>
              )}
            </div>
          )}

          {captainError && (
            <div
              className={`flex items-start gap-2 p-3 rounded-[10px] text-xs font-medium ${
                captainError.toLowerCase().includes("already")
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  captainError.toLowerCase().includes("already") ? "text-amber-600" : "text-rose-600"
                }`}
              />
              <div className="space-y-0.5">
                {captainError.toLowerCase().includes("already") && (
                  <span className="font-semibold block text-amber-950">Already Registered for this Event</span>
                )}
                <span className="leading-relaxed">{captainError}</span>
              </div>
            </div>
          )}

          {/* Captain Gmail Test & Live Confirmation (shown once captain is verified) */}
          {captainVerified && (
            <div className="space-y-2.5 p-3.5 rounded-[10px] bg-[#F9FAFB] border border-[#E5E7EB] mt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Captain Gmail Address
                </label>
                {isEmailConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 font-medium">Confirmation Required</span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={captainEmailInput}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  disabled={isEmailConfirmed}
                  className={`flex-1 h-12 px-3.5 text-base border rounded-[10px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#9B1B3A] transition-colors ${
                    isEmailConfirmed
                      ? "bg-emerald-50/60 border-emerald-300 text-emerald-950 font-semibold"
                      : "bg-white border-[#E5E7EB] focus:border-[#9B1B3A]"
                  }`}
                  required
                />

                {!isEmailConfirmed ? (
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={emailSendingOtp || !captainEmailInput.trim() || resendCooldown > 0}
                    className="h-12 px-4 bg-[#9B1B3A] hover:bg-[#821630] text-white text-xs sm:text-sm font-medium rounded-[10px] transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {emailSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend (${resendCooldown}s)`
                    ) : emailOtpSent ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Deliver Test Gmail
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
                    }}
                    className="h-12 px-3.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 rounded-[10px] shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Click <strong>Deliver Test Gmail</strong> to receive a 6-digit confirmation code.
                This confirms that your Gmail can receive your team login password.
              </p>

              {/* 6-Digit OTP Code Input */}
              {emailOtpSent && !isEmailConfirmed && (
                <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-gray-200 mt-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="h-11 px-3 text-center font-mono text-base font-bold tracking-widest border border-gray-300 rounded-[10px] sm:w-36 focus:border-[#9B1B3A] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmEmailCode}
                    disabled={emailVerifyingOtp || emailOtpCode.trim().length < 6}
                    className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-[10px] transition-colors flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {emailVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Confirm Code
                      </>
                    )}
                  </button>
                </div>
              )}

              {emailVerificationMsg && (
                <div
                  className={`text-xs p-2.5 rounded-[8px] flex items-start gap-1.5 ${
                    emailVerificationMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {emailVerificationMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{emailVerificationMsg.text}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Team Details & Squad Management Section */}
        <div className="space-y-4" data-purpose="team-details-and-squad">
          {/* Team Name Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700" htmlFor="team-name">
              Team name
            </label>
            <input
              id="team-name"
              name="team-name"
              type="text"
              placeholder="e.g. Champaran Quizzers"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full h-12 px-3.5 text-base border border-[#E5E7EB] rounded-[10px] text-gray-900 focus:border-[#9B1B3A] focus:ring-1 focus:ring-[#9B1B3A] outline-none transition-colors"
            />
            <p className="text-xs text-gray-500">Team name must be unique</p>
          </div>

          {/* Add Teammates Input & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700" htmlFor="teammate-search">
                Add teammates
              </label>
              <span className="text-xs font-medium text-gray-500">
                {currentCount} of {minSize}–{maxSize} members added
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="teammate-search"
                type="text"
                placeholder="Enter classmate's Roll No. or Name"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-10 pr-3.5 text-base border border-[#E5E7EB] rounded-[10px] text-gray-900 focus:border-[#9B1B3A] focus:ring-1 focus:ring-[#9B1B3A] outline-none transition-colors"
              />
              {searching && (
                <Loader2 className="w-4 h-4 animate-spin text-[#9B1B3A] absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && searchFocused && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {searchResults.map((st) => {
                    const isTaken = !!st.already_registered;
                    return (
                      <button
                        key={st.roll}
                        type="button"
                        onMouseDown={() => handleAddTeammate(st)}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition-colors text-sm ${
                          isTaken
                            ? "bg-stone-50/80 cursor-not-allowed hover:bg-stone-100/90"
                            : "hover:bg-rose-50"
                        }`}
                      >
                        <div>
                          <span
                            className={`font-medium ${
                              isTaken ? "text-stone-400 line-through" : "text-gray-900"
                            }`}
                          >
                            {st.name}
                          </span>
                          <span className="text-gray-500 text-xs ml-1.5 font-normal">
                            · {st.roll} ({st.branch})
                          </span>
                          {st.participation && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded ml-1 font-mono border border-blue-200">
                              {st.participation}
                            </span>
                          )}
                        </div>
                        {isTaken ? (
                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                            In: {st.registered_team}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-[#2563EB] shrink-0">+ Add</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {searchError && <p className="text-xs text-rose-600 font-medium">{searchError}</p>}

            {/* Squad Members List / Rows */}
            <div className="space-y-2 pt-1" data-purpose="squad-list">
              {/* Captain Row (Pinned) */}
              {captainVerified && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <div className="truncate text-sm text-gray-900">
                      <span className="font-medium">{captainVerified.name}</span>
                      <span className="text-xs text-gray-500 ml-1 font-normal">
                        · {captainVerified.roll} ({captainVerified.branch})
                      </span>
                      <span className="text-[10px] font-semibold bg-[#9B1B3A] text-white px-1.5 py-0.2 rounded ml-1.5">
                        Captain
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Teammates Rows */}
              {teammates.map((tm) => (
                <div
                  key={tm.roll}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px]"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <div className="truncate text-sm text-gray-900">
                      <span className="font-medium">{tm.name}</span>
                      <span className="text-xs text-gray-500 ml-1 font-normal">
                        · {tm.roll} ({tm.branch})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeammate(tm.roll)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Remove teammate"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Primary CTA */}
        <div className="pt-2 space-y-3" data-purpose="form-actions">
          <button
            type="submit"
            disabled={
              submitting ||
              !captainVerified ||
              !teamName.trim() ||
              !isEmailConfirmed ||
              !isSizeValid
            }
            className="w-full h-12 bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-[0.99] text-white font-semibold rounded-[10px] transition-all flex items-center justify-center text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Registering Team...
              </>
            ) : (
              "Register Team"
            )}
          </button>

          {submitError && (
            <div className="p-3 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {!isEmailConfirmed && captainVerified && (
            <p className="text-center text-xs text-amber-700">
              ⚠️ Please confirm your Gmail address above by entering the 6-digit test code before completing registration.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
