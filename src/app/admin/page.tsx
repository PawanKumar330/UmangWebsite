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
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { EventItem, Team, Notice } from "@/types";

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"events" | "teams" | "reset" | "notices">("events");

  // Admin Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Teams Search & Filter
  const [selectedEventFilter, setSelectedEventFilter] = useState("ALL");
  const [teamSearch, setTeamSearch] = useState("");
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);

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
        setLoginError(res.error || "Invalid admin password.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to authenticate admin.");
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
      setEventModalMsg({ type: "error", text: "Please enter a Source Sheet ID or Google Sheets URL." });
      return;
    }

    setInspectingSheet(true);
    setInspectResult(null);
    setEventModalMsg(null);

    try {
      const res = await callApi({
        action: "adminInspectSourceSheet",
        token: adminToken,
        source_sheet_id: eventFormData.source_sheet_id.trim(),
        source_tab_name: eventFormData.source_tab_name.trim(),
      });

      if (res.ok && res.data) {
        setInspectResult(res.data);
      } else {
        setEventModalMsg({ type: "error", text: res.error || "Failed to inspect sheet." });
      }
    } catch (err: any) {
      setEventModalMsg({ type: "error", text: err.message || "Failed to connect to sheet." });
    } finally {
      setInspectingSheet(false);
    }
  };

  const handleSourceSheetInput = (val: string) => {
    // Check if full Google Sheets URL
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
        setEventModalMsg({ type: "success", text: "Event saved successfully in Portal DB!" });
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
        setNoticeResult({ type: "success", text: "Notice posted successfully to public bulletin!" });
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
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-festive-maroon-900 text-festive-gold-400 mx-auto flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Authentication
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Motihari College of Engineering • UMANG 2026 Fest Committee
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Admin Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter admin password..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-festive-maroon-800 to-festive-saffron-700 hover:opacity-95 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Admin...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-festive-gold-300" /> Enter Admin Panel
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400">
            Protected area. Master password is kept in Apps Script Script Properties.
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-festive-maroon-900 text-festive-gold-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Fest Administrator
            </span>
            <span className="text-xs text-slate-400">MCE Motihari Portal DB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Admin Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure events, manage Google Form source sheets, reset captain credentials, and inspect team rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdminData(adminToken)}
            disabled={loadingData}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            {loadingData ? "Refreshing..." : "Refresh Data"}
          </button>
          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-festive-maroon-50 text-festive-maroon-700 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{events.length}</div>
            <div className="text-xs text-slate-500 font-medium">Cultural Events</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-festive-gold-50 text-amber-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{teams.length}</div>
            <div className="text-xs text-slate-500 font-medium">Registered Teams</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-festive-saffron-50 text-festive-saffron-700 flex items-center justify-center font-bold">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{notices.length}</div>
            <div className="text-xs text-slate-500 font-medium">Bulletins & Notices</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "events", label: "Manage Events", icon: Calendar },
          { id: "teams", label: `Teams Roster (${teams.length})`, icon: Users },
          { id: "reset", label: "Reset Captain Password", icon: KeyRound },
          { id: "notices", label: "Post Bulletins", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                isActive
                  ? "bg-festive-maroon-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MANAGE EVENTS */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Each event maps to its own Google Form responses sheet ID.
            </p>
            <button
              onClick={() => openEventModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-festive-maroon-700 hover:bg-festive-maroon-800 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Cultural Event
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => (
              <div
                key={evt.event_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        evt.is_open
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {evt.is_open ? "Registration Open" : "Registration Closed"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{evt.event_id}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{evt.event_name}</h3>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Squad limits: <strong>{evt.min_team_size}</strong> to{" "}
                        <strong>{evt.max_team_size}</strong> members
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Deadline:{" "}
                        <strong>
                          {new Date(evt.deadline).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 truncate pt-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Source ID: {evt.source_sheet_id || "(Not configured yet)"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => openEventModal(evt)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-festive-maroon-700 bg-festive-maroon-50 hover:bg-festive-maroon-100"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Event Config
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS ROSTER */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team name, captain email, member roll/name..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-festive-maroon-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-slate-50"
              >
                <option value="ALL">All Events ({teams.length})</option>
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.event_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teams Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Team ID & Name</th>
                    <th className="px-5 py-3.5">Event</th>
                    <th className="px-5 py-3.5">Captain Email</th>
                    <th className="px-5 py-3.5">Members</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                        No registered teams found.
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => (
                      <tr key={team.team_id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{team.team_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{team.team_id}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold text-slate-800">
                            {team.event_name || team.event_id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {team.captain_email}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                            {team.members.length} Members
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {team.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setViewingTeam(team)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-festive-maroon-700 bg-festive-maroon-50 hover:bg-festive-maroon-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Squad
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

      {/* TAB 3: RESET CAPTAIN PASSWORD */}
      {activeTab === "reset" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-festive-maroon-700" />
                Reset Captain Login Password
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the captain's email address. The backend will generate a new random 8-character password,
                update the SHA-256 hash in the Captains tab, and email the plain password to the captain via Gmail.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Captain Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. prashant.kumar@gmail.com"
                  value={resetCaptainEmail}
                  onChange={(e) => setResetCaptainEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
                  required
                />
              </div>

              {resetResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 ${
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
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-festive-maroon-700 hover:bg-festive-maroon-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating & Sending New Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" /> Generate & Email New Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: POST NOTICES & SCHEDULES */}
      {activeTab === "notices" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-festive-maroon-700" />
                Publish Fest Notice / Schedule / Result
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Posted items immediately appear on the public notices board and in registered captains' dashboards.
              </p>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Target Event
                  </label>
                  <select
                    value={noticeForm.event_id}
                    onChange={(e) => setNoticeForm({ ...noticeForm, event_id: e.target.value })}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-300 text-xs sm:text-sm font-medium bg-slate-50"
                  >
                    <option value="ALL">ALL Events (General Fest Notice)</option>
                    {events.map((evt) => (
                      <option key={evt.event_id} value={evt.event_id}>
                        {evt.event_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Type
                  </label>
                  <select
                    value={noticeForm.type}
                    onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value })}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-300 text-xs sm:text-sm font-medium bg-slate-50"
                  >
                    <option value="notice">Official Notice</option>
                    <option value="schedule">Schedule / Slot</option>
                    <option value="result">Result / Announcement</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battle of Bands Sound Check Schedule"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Body Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter notice details, reporting timings, guidelines..."
                  value={noticeForm.body}
                  onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-medium"
                  required
                />
              </div>

              {noticeResult && (
                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 ${
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
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-festive-maroon-700 hover:bg-festive-maroon-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {postingNotice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Publishing Notice...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" /> Publish Notice to Portal
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EVENT EDIT / ADD MODAL */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-extrabold text-slate-900">
                {editingEventId ? "Edit Cultural Event" : "Create New Cultural Event"}
              </h3>
              <button
                onClick={() => setEventModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Event Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battle of Bands"
                  value={eventFormData.event_name}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, event_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Source Google Sheet ID or URL
                  </label>
                  <input
                    type="text"
                    placeholder="Paste ID or full Google Sheet URL..."
                    value={eventFormData.source_sheet_id}
                    onChange={(e) => handleSourceSheetInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Paste ID or full URL (e.g. https://docs.google.com/spreadsheets/d/.../edit?gid=...)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Tab Name or GID
                  </label>
                  <input
                    type="text"
                    placeholder="Form Responses 1 or GID (e.g. 944636428)"
                    value={eventFormData.source_tab_name}
                    onChange={(e) =>
                      setEventFormData({ ...eventFormData, source_tab_name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-medium"
                  />
                  <p className="text-[10px] text-slate-400">
                    Tab title or numeric GID from sheet URL.
                  </p>
                </div>
              </div>

              {/* Inspect / Test Sheet Button */}
              {eventFormData.source_sheet_id && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleInspectSheet}
                    disabled={inspectingSheet}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                  >
                    {inspectingSheet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-festive-maroon-700" />
                        Testing Connection to Sheet...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        Test Sheet Connection & Verify Columns
                      </>
                    )}
                  </button>

                  {/* Inspection Results Box */}
                  {inspectResult && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-slate-800">
                          {inspectResult.spreadsheet_title || "Sheet Connected"}
                        </span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {inspectResult.total_students_found} Student Records Found
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">Name Column:</span>{" "}
                          <strong className="text-slate-800">{inspectResult.detected_mapping?.name_column}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Roll Column:</span>{" "}
                          <strong className="text-slate-800">{inspectResult.detected_mapping?.roll_column}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Email Column:</span>{" "}
                          <strong className="text-slate-800">{inspectResult.detected_mapping?.email_column}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Branch Column:</span>{" "}
                          <strong className="text-slate-800">{inspectResult.detected_mapping?.branch_column}</strong>
                        </div>
                      </div>

                      {inspectResult.sample_students && inspectResult.sample_students.length > 0 && (
                        <div className="pt-1 border-t border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Sample Parsed Rows:</span>
                          <div className="space-y-1 mt-1">
                            {inspectResult.sample_students.map((st: any, i: number) => (
                              <div key={i} className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                                <strong>{st.name}</strong> • Roll: <code>{st.roll}</code> • {st.branch}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Min Team Size
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
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Max Team Size
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
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Registration Deadline (Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.deadline}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, deadline: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-medium"
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
                  className="w-4 h-4 rounded text-festive-maroon-700 focus:ring-festive-maroon-700"
                />
                <label htmlFor="is_open_check" className="text-sm font-medium text-slate-700">
                  Allow Public Registrations (is_open)
                </label>
              </div>

              {eventModalMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    eventModalMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {eventModalMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{eventModalMsg.text}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-festive-maroon-700 hover:bg-festive-maroon-800 text-xs sm:text-sm disabled:opacity-50"
                >
                  {savingEvent ? "Saving to Sheet..." : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM DETAILS MODAL */}
      {viewingTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase text-festive-maroon-700">
                  {viewingTeam.event_name || viewingTeam.event_id}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">{viewingTeam.team_name}</h3>
              </div>
              <button
                onClick={() => setViewingTeam(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <div>
                  Captain Email: <strong>{viewingTeam.captain_email}</strong>
                </div>
                <div>
                  Team ID: <span className="font-mono">{viewingTeam.team_id}</span>
                </div>
                <div>
                  Registration Status:{" "}
                  <span className="font-bold text-emerald-700">{viewingTeam.status}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                  Registered Members ({viewingTeam.members.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {viewingTeam.members.map((m) => (
                    <div
                      key={m.roll}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {m.name}{" "}
                          {m.is_captain && (
                            <span className="text-[10px] font-bold bg-festive-maroon-700 text-white px-1.5 py-0.2 rounded ml-1">
                              Captain
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Roll: {m.roll} • {m.branch}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewingTeam(null)}
              className="w-full py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
