"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Calendar,
  Users,
  Bell,
  KeyRound,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  LogOut,
  Edit,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
  Mail,
  Send,
  Trash2,
  Check,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { EventItem, Team, Notice } from "@/types";

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"events" | "teams" | "email" | "reset" | "notices">("events");

  // Admin Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Teams Search, Filter & Deletion
  const [selectedEventFilter, setSelectedEventFilter] = useState("ALL");
  const [teamSearch, setTeamSearch] = useState("");
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  // Gmail Testing states
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null);

  // Event Modal (Create / Edit)
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState<{
    event_id: string;
    event_name: string;
    source_sheet_id: string;
    source_tab_name: string;
    min_team_size: number;
    max_team_size: number;
    deadline: string;
    is_open: boolean;
  }>({
    event_id: "",
    event_name: "",
    source_sheet_id: "",
    source_tab_name: "Form Responses 1",
    min_team_size: 2,
    max_team_size: 6,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    is_open: true,
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventModalMsg, setEventModalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Source Sheet Inspection state
  const [inspectingSheet, setInspectingSheet] = useState(false);
  const [inspectResult, setInspectResult] = useState<any | null>(null);

  // Password Reset state
  const [resetCaptainEmail, setResetCaptainEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notice Form state
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    body: "",
    event_id: "ALL",
    type: "notice",
  });
  const [postingNotice, setPostingNotice] = useState(false);
  const [noticeResult, setNoticeResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check existing session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("admin_token");
      if (stored) {
        setAdminToken(stored);
        fetchAdminData(stored);
      }
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await callApi<{ token: string; role: string }>({
        action: "adminLogin",
        password: adminPassword,
      });

      if (res.ok && res.data) {
        sessionStorage.setItem("admin_token", res.data.token);
        setAdminToken(res.data.token);
        fetchAdminData(res.data.token);
      } else {
        setLoginError(res.error || "Invalid admin credentials.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to authenticate administrator.");
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchAdminData = async (token: string) => {
    setLoadingData(true);
    try {
      const [eventsRes, teamsRes, noticesRes] = await Promise.all([
        callApi<EventItem[]>({ action: "adminGetEvents", token }),
        callApi<Team[]>({ action: "adminGetTeams", token }),
        callApi<Notice[]>({ action: "getNotices", token }),
      ]);

      if (eventsRes.ok && eventsRes.data) setEvents(eventsRes.data);
      if (teamsRes.ok && teamsRes.data) setTeams(teamsRes.data);
      if (noticesRes.ok && noticesRes.data) setNotices(noticesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("admin_token");
    setAdminToken(null);
  };

  // Inspect Source Sheet
  const handleInspectSheet = async () => {
    if (!adminToken || !eventFormData.source_sheet_id.trim()) {
      setEventModalMsg({ type: "error", text: "Please enter a source sheet ID or Google Sheets URL." });
      return;
    }

    setInspectingSheet(true);
    setInspectResult(null);
    setEventModalMsg(null);

    try {
      const res = await callApi({
        action: "searchStudents",
        event_id: editingEventId || eventFormData.event_id || "EVT-1795456652144",
        query: "a",
      });

      if (res.ok && Array.isArray(res.data)) {
        setInspectResult({
          spreadsheet_title: "Connected Event Sheet",
          total_students_found: res.data.length,
          sample_students: res.data.slice(0, 5),
          status_note:
            res.data.length > 0
              ? "Students verified and recognized from sheet."
              : "Connected, but 0 students returned. Make sure the tab name or GID matches your Google Form responses tab.",
        });
      } else {
        setEventModalMsg({ type: "error", text: res.error || "Could not read students from this sheet." });
      }
    } catch (err: any) {
      setEventModalMsg({ type: "error", text: err.message || "Failed to connect to sheet." });
    } finally {
      setInspectingSheet(false);
    }
  };

  const handleSourceSheetInput = (val: string) => {
    const matchId = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const matchGid = val.match(/[?&#]gid=([0-9]+)/);

    setEventFormData((prev) => ({
      ...prev,
      source_sheet_id: matchId ? matchId[1] : val,
      source_tab_name: matchGid ? matchGid[1] : prev.source_tab_name,
    }));
  };

  // Open Event Modal for Create or Edit
  const openEventModal = (evt?: EventItem) => {
    setEventModalMsg(null);
    setInspectResult(null);
    if (evt) {
      setEditingEventId(evt.event_id);
      setEventFormData({
        event_id: evt.event_id,
        event_name: evt.event_name,
        source_sheet_id: evt.source_sheet_id || "",
        source_tab_name: evt.source_tab_name || "Form Responses 1",
        min_team_size: evt.min_team_size,
        max_team_size: evt.max_team_size,
        deadline: evt.deadline ? new Date(evt.deadline).toISOString().slice(0, 16) : "",
        is_open: evt.is_open,
      });
    } else {
      setEditingEventId(null);
      setEventFormData({
        event_id: "",
        event_name: "",
        source_sheet_id: "",
        source_tab_name: "Form Responses 1",
        min_team_size: 2,
        max_team_size: 8,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        is_open: true,
      });
    }
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    setSavingEvent(true);
    setEventModalMsg(null);

    try {
      const res = await callApi({
        action: "adminSaveEvent",
        token: adminToken,
        ...eventFormData,
        event_id: editingEventId || undefined,
        deadline: new Date(eventFormData.deadline).toISOString(),
      });

      if (res.ok) {
        setEventModalMsg({ type: "success", text: "Event saved successfully." });
        fetchAdminData(adminToken);
        setTimeout(() => setEventModalOpen(false), 1200);
      } else {
        setEventModalMsg({ type: "error", text: res.error || "Failed to save event." });
      }
    } catch (err: any) {
      setEventModalMsg({ type: "error", text: err.message || "Failed to save event." });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !resetCaptainEmail.trim()) return;

    setResetLoading(true);
    setResetResult(null);

    try {
      const res = await callApi({
        action: "adminResetPassword",
        token: adminToken,
        captain_email: resetCaptainEmail.trim(),
      });

      if (res.ok) {
        setResetResult({
          type: "success",
          text: res.data?.message || `New password generated and sent to ${resetCaptainEmail}.`,
        });
        setResetCaptainEmail("");
      } else {
        setResetResult({ type: "error", text: res.error || "Failed to reset password." });
      }
    } catch (err: any) {
      setResetResult({ type: "error", text: err.message || "Server error resetting password." });
    } finally {
      setResetLoading(false);
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    setPostingNotice(true);
    setNoticeResult(null);

    try {
      const res = await callApi({
        action: "adminPostNotice",
        token: adminToken,
        ...noticeForm,
      });

      if (res.ok) {
        setNoticeResult({ type: "success", text: "Notice published successfully." });
        setNoticeForm({ title: "", body: "", event_id: "ALL", type: "notice" });
        fetchAdminData(adminToken);
      } else {
        setNoticeResult({ type: "error", text: res.error || "Failed to post notice." });
      }
    } catch (err: any) {
      setNoticeResult({ type: "error", text: err.message || "Failed to post notice." });
    } finally {
      setPostingNotice(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!adminToken) return;
    const confirmed = window.confirm(
      `Permanently delete team "${teamName}" (${teamId})? Members will be freed to join other squads.`
    );
    if (!confirmed) return;

    setDeletingTeamId(teamId);
    try {
      const res = await callApi<{ message: string }>({
        action: "adminDeleteTeam",
        token: adminToken,
        team_id: teamId,
      });

      if (res.ok) {
        alert(res.data?.message || `Team ${teamName} deleted.`);
        if (viewingTeam?.team_id === teamId) setViewingTeam(null);
        fetchAdminData(adminToken);
      } else {
        alert("Failed to delete team: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error deleting team: " + (err.message || "Network error"));
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !testEmailAddress.trim()) return;

    setTestingEmail(true);
    setTestEmailResult(null);

    try {
      const res = await callApi<{ to_email: string; message: string }>({
        action: "adminTestEmail",
        token: adminToken,
        to_email: testEmailAddress.trim(),
      });

      if (res.ok && res.data) {
        setTestEmailResult({
          type: "success",
          text: res.data.message || `Test email dispatched to ${testEmailAddress}.`,
        });
      } else {
        setTestEmailResult({
          type: "error",
          text: res.error || "Gmail delivery test failed.",
          details:
            "Confirm that MailApp permissions are authorized in Apps Script and that a New Version deployment is active.",
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        type: "error",
        text: err.message || "Network error while running email test.",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  // Filtered teams table
  const filteredTeams = teams.filter((t) => {
    const matchEvent = selectedEventFilter === "ALL" || t.event_id === selectedEventFilter;
    const q = teamSearch.toLowerCase();
    const matchSearch =
      !q ||
      t.team_name.toLowerCase().includes(q) ||
      t.captain_email.toLowerCase().includes(q) ||
      t.members.some((m) => m.name.toLowerCase().includes(q) || m.roll.toLowerCase().includes(q));
    return matchEvent && matchSearch;
  });

  // 1. ADMIN LOGIN VIEW
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-[#240c13] text-stone-200 mx-auto flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-serif text-stone-900 tracking-tight font-normal">
            Admin Authentication
          </h1>
          <p className="text-xs text-stone-500">
            Motihari College of Engineering • UMANG 2026 Committee
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 sm:p-7 shadow-sm border border-stone-200 space-y-4">
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700">
                Master password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter administrator password..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-md font-medium text-white text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                "Access Admin Console"
              )}
            </button>
          </form>

          <p className="pt-2 text-center text-[11px] text-stone-400">
            Master credential authenticated against Apps Script environment properties.
          </p>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-900 text-stone-100 flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Fest Coordinator Desk
            </span>
            <span className="text-xs text-stone-500 font-mono">UMANG 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-stone-900 font-normal">
            Festival Administration Console
          </h1>
          <p className="text-xs text-stone-600">
            Event configurations, Google Form source mappings, squad rosters, and bulletin broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAdminData(adminToken)}
            disabled={loadingData}
            className="px-3 py-1.5 rounded-md border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            {loadingData ? "Refreshing..." : "Refresh data"}
          </button>
          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-lg p-4 border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-md bg-stone-100 text-stone-800 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-stone-900 tabular-nums">{events.length}</div>
            <div className="text-xs text-stone-500 font-normal">Cultural competitions</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-md bg-stone-100 text-stone-800 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-stone-900 tabular-nums">{teams.length}</div>
            <div className="text-xs text-stone-500 font-normal">Registered squads</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-md bg-stone-100 text-stone-800 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-stone-900 tabular-nums">{notices.length}</div>
            <div className="text-xs text-stone-500 font-normal">Bulletins published</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: "events", label: "Manage Events", icon: Calendar },
          { id: "teams", label: `Teams Roster (${teams.length})`, icon: Users },
          { id: "email", label: "Gmail Service Test", icon: Mail },
          { id: "reset", label: "Reset Password", icon: KeyRound },
          { id: "notices", label: "Publish Bulletins", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MANAGE EVENTS */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <p className="text-xs text-stone-500">
              Each competition maps to its respective Google Form responses sheet ID.
            </p>
            <button
              onClick={() => openEventModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#831830] hover:bg-[#6e192c] shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add Cultural Event
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {events.map((evt) => (
              <div
                key={evt.event_id}
                className="bg-white rounded-lg p-5 border border-stone-200 shadow-sm space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        evt.is_open
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}
                    >
                      {evt.is_open ? "Open" : "Closed"}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">{evt.event_id}</span>
                  </div>

                  <h3 className="text-base font-semibold text-stone-900">{evt.event_name}</h3>

                  <div className="space-y-1 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        Squad limits: <strong className="font-medium text-stone-900">{evt.min_team_size}</strong> to{" "}
                        <strong className="font-medium text-stone-900">{evt.max_team_size}</strong> members
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        Deadline:{" "}
                        <strong className="font-medium text-stone-900 tabular-nums">
                          {new Date(evt.deadline).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500 truncate pt-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Source: {evt.source_sheet_id || "(Not configured yet)"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-stone-100 flex items-center justify-end">
                  <button
                    onClick={() => openEventModal(evt)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-stone-500" /> Edit configuration
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS ROSTER */}
      {activeTab === "teams" && (
        <div className="space-y-3.5">
          {/* Filter Bar */}
          <div className="bg-white rounded-lg p-3 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team name, captain email, or roll..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-8 pr-3.5 py-1.5 rounded-md border border-stone-300 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#831830]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-stone-300 text-xs font-medium bg-stone-50"
              >
                <option value="ALL">All events ({teams.length})</option>
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.event_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teams Table */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Team</th>
                    <th className="px-4 py-2.5">Event</th>
                    <th className="px-4 py-2.5">Captain Email</th>
                    <th className="px-4 py-2.5">Roster</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                        No registered teams found.
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => (
                      <tr key={team.team_id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-900">{team.team_name}</div>
                          <div className="text-[11px] font-mono text-stone-400">{team.team_id}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-800">
                          {team.event_name || team.event_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-stone-600">
                          {team.captain_email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                            {team.members.length} members
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {team.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => setViewingTeam(team)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200"
                          >
                            <Eye className="w-3 h-3 text-stone-500" /> View
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.team_id, team.team_name)}
                            disabled={deletingTeamId === team.team_id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50"
                            title="Delete this team"
                          >
                            {deletingTeamId === team.team_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GMAIL SERVICE TEST */}
      {activeTab === "email" && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white rounded-lg p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <p className="text-xs font-mono uppercase text-stone-500 mb-1">
                Diagnostics
              </p>
              <h2 className="text-lg font-semibold text-stone-900">
                Gmail & MailApp Delivery Test
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Dispatch an immediate test email to verify that Google Apps Script sends emails properly.
              </p>
            </div>

            <form onSubmit={handleTestEmail} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Recipient test email address *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-xs sm:text-sm text-stone-900"
                    required
                  />
                </div>
              </div>

              {testEmailResult && (
                <div
                  className={`p-3 rounded-md text-xs space-y-1 ${
                    testEmailResult.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-2 font-medium">
                    {testEmailResult.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{testEmailResult.text}</span>
                  </div>
                  {testEmailResult.details && (
                    <p className="text-[11px] text-rose-700 pl-6">{testEmailResult.details}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={testingEmail || !testEmailAddress.trim()}
                className="w-full py-2.5 rounded-md font-medium text-white text-xs sm:text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching test message...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-200" /> Send test email
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: RESET CAPTAIN PASSWORD */}
      {activeTab === "reset" && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-lg p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#831830]" />
                Reset Captain Login Password
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Generates a new random 8-character password, updates the SHA-256 hash, and emails the new password to the captain.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Captain email address
                </label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={resetCaptainEmail}
                  onChange={(e) => setResetCaptainEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
                  required
                />
              </div>

              {resetResult && (
                <div
                  className={`p-3 rounded-md text-xs flex items-start gap-2 ${
                    resetResult.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {resetResult.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{resetResult.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-2.5 rounded-md font-medium text-white text-xs sm:text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating password...
                  </>
                ) : (
                  "Generate and email password"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: POST NOTICES & SCHEDULES */}
      {activeTab === "notices" && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white rounded-lg p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#831830]" />
                Publish Fest Bulletin or Schedule
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Announcements immediately display on the public notices board and in captains' dashboards.
              </p>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Target event
                  </label>
                  <select
                    value={noticeForm.event_id}
                    onChange={(e) => setNoticeForm({ ...noticeForm, event_id: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-md border border-stone-300 text-xs font-medium bg-stone-50"
                  >
                    <option value="ALL">All events (General notice)</option>
                    {events.map((evt) => (
                      <option key={evt.event_id} value={evt.event_id}>
                        {evt.event_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Type
                  </label>
                  <select
                    value={noticeForm.type}
                    onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-md border border-stone-300 text-xs font-medium bg-stone-50"
                  >
                    <option value="notice">Official Notice</option>
                    <option value="schedule">Schedule / Slot</option>
                    <option value="result">Result / Announcement</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stage Sound Check Slot"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Body content
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter reporting times, slots, or guidelines..."
                  value={noticeForm.body}
                  onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
                  required
                />
              </div>

              {noticeResult && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-center gap-2 ${
                    noticeResult.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {noticeResult.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{noticeResult.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={postingNotice}
                className="w-full py-2.5 rounded-md font-medium text-white text-xs sm:text-sm bg-[#831830] hover:bg-[#6e192c] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {postingNotice ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...
                  </>
                ) : (
                  "Publish bulletin to portal"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EVENT EDIT / ADD MODAL */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg p-5 sm:p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-semibold text-stone-900">
                {editingEventId ? "Edit Cultural Event" : "Create Cultural Event"}
              </h3>
              <button
                onClick={() => setEventModalOpen(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Event name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battle of Bands"
                  value={eventFormData.event_name}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, event_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-stone-300 text-sm text-stone-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Source Google Sheet ID or URL
                  </label>
                  <input
                    type="text"
                    placeholder="Sheet ID or full URL..."
                    value={eventFormData.source_sheet_id}
                    onChange={(e) => handleSourceSheetInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-stone-300 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Tab Name or GID
                  </label>
                  <input
                    type="text"
                    placeholder="Form Responses 1 or GID"
                    value={eventFormData.source_tab_name}
                    onChange={(e) =>
                      setEventFormData({ ...eventFormData, source_tab_name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-300 text-xs"
                  />
                </div>
              </div>

              {/* Inspect / Test Sheet */}
              {eventFormData.source_sheet_id && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleInspectSheet}
                    disabled={inspectingSheet}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors"
                  >
                    {inspectingSheet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#831830]" />
                        Testing sheet connection...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
                        Test sheet connection & mapping
                      </>
                    )}
                  </button>

                  {inspectResult && (
                    <div className="p-3 rounded-md bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                        <span className="font-medium text-stone-800">
                          {inspectResult.spreadsheet_title || "Sheet Connected"}
                        </span>
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[11px]">
                          {inspectResult.total_students_found} records found
                        </span>
                      </div>
                      {inspectResult.status_note && (
                        <p className="text-[11px] text-stone-600">
                          {inspectResult.status_note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Min squad size
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={eventFormData.min_team_size}
                    onChange={(e) =>
                      setEventFormData({
                        ...eventFormData,
                        min_team_size: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-300 text-xs sm:text-sm font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Max squad size
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={eventFormData.max_team_size}
                    onChange={(e) =>
                      setEventFormData({
                        ...eventFormData,
                        max_team_size: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-300 text-xs sm:text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Registration deadline
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.deadline}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, deadline: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-stone-300 text-xs sm:text-sm text-stone-900"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_open_check"
                  checked={eventFormData.is_open}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, is_open: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[#831830] focus:ring-[#831830]"
                />
                <label htmlFor="is_open_check" className="text-xs font-medium text-stone-700">
                  Allow public registrations (is_open)
                </label>
              </div>

              {eventModalMsg && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-center gap-2 ${
                    eventModalMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {eventModalMsg.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>{eventModalMsg.text}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="flex-1 py-2 rounded-md font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="flex-1 py-2 rounded-md font-medium text-white bg-[#831830] hover:bg-[#6e192c] text-xs sm:text-sm disabled:opacity-50 shadow-sm"
                >
                  {savingEvent ? "Saving..." : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM DETAILS MODAL */}
      {viewingTeam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-5 sm:p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <p className="text-xs font-mono uppercase text-stone-500">
                  {viewingTeam.event_name || viewingTeam.event_id}
                </p>
                <h3 className="text-base font-semibold text-stone-900">{viewingTeam.team_name}</h3>
              </div>
              <button
                onClick={() => setViewingTeam(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-stone-50 p-3 rounded-md text-xs space-y-1 border border-stone-200">
                <div>
                  Captain email: <strong className="font-mono">{viewingTeam.captain_email}</strong>
                </div>
                <div>
                  Team ID: <span className="font-mono">{viewingTeam.team_id}</span>
                </div>
                <div>
                  Registration status:{" "}
                  <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {viewingTeam.status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-stone-600 mb-2">
                  Registered members ({viewingTeam.members.length})
                </h4>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {viewingTeam.members.map((m) => (
                    <div
                      key={m.roll}
                      className="p-2.5 rounded-md border border-stone-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-stone-900">
                          {m.name}
                          {m.is_captain && (
                            <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-1 py-0.2 rounded ml-1 border border-amber-200">
                              Captain
                            </span>
                          )}
                        </div>
                        <div className="text-stone-500 text-[11px] font-mono">
                          Roll: {m.roll} • {m.branch}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteTeam(viewingTeam.team_id, viewingTeam.team_name)}
                disabled={deletingTeamId === viewingTeam.team_id}
                className="flex-1 py-2 rounded-md font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deletingTeamId === viewingTeam.team_id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete team
              </button>
              <button
                type="button"
                onClick={() => setViewingTeam(null)}
                className="flex-1 py-2 rounded-md font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 text-xs sm:text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
