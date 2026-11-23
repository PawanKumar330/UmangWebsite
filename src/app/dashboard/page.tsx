"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Trophy,
  Calendar,
  Clock,
  Lock,
  Unlock,
  Edit3,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Bell,
  Sparkles,
  LogOut,
  Loader2,
  X,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { callApi } from "@/lib/api";
import { Team, TeamMember, Student, Notice } from "@/types";

export default function CaptainDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [captainEmail, setCaptainEmail] = useState<string | null>(null);
  const [captainName, setCaptainName] = useState<string | null>(null);

  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"teams" | "notices">("teams");

  // Edit Team Modal states
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState<string>("");
  const [editMembers, setEditMembers] = useState<TeamMember[]>([]);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [editSuccess, setEditSuccess] = useState<string>("");

  // Edit Teammate search
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");
  const [memberSearchResults, setMemberSearchResults] = useState<Student[]>([]);
  const [memberSearching, setMemberSearching] = useState<boolean>(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  // Authenticate session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem("captain_token");
      const storedEmail = sessionStorage.getItem("captain_email");
      const storedName = sessionStorage.getItem("captain_name");

      if (!storedToken || !storedEmail) {
        router.push("/login");
        return;
      }

      setToken(storedToken);
      setCaptainEmail(storedEmail);
      setCaptainName(storedName);

      loadCaptainData(storedToken);
    }
  }, [router]);

  // Fetch Captain's Teams and Relevant Notices
  const loadCaptainData = async (currentToken: string) => {
    setLoading(true);
    try {
      const res = await callApi<{
        captain_email: string;
        teams: Team[];
      }>({
        action: "getMyTeams",
        token: currentToken,
      });

      if (res.ok && res.data) {
        setTeams(res.data.teams || []);

        // Load Notices for captain's events
        const eventIds = Array.from(new Set(res.data.teams.map((t) => t.event_id)));
        const noticesRes = await callApi<Notice[]>({
          action: "getNotices",
        });

        if (noticesRes.ok && noticesRes.data) {
          // Filter notices for "ALL" or events captain is registered in
          const filtered = noticesRes.data.filter(
            (n) => n.event_id === "ALL" || eventIds.includes(n.event_id)
          );
          setNotices(filtered);
        }
      } else {
        // If session expired or unauthorized
        sessionStorage.removeItem("captain_token");
        router.push("/login");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.team_name);
    setEditMembers([...team.members]);
    setEditError("");
    setEditSuccess("");
    setMemberSearchQuery("");
    setMemberSearchResults([]);
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setEditingTeam(null);
    setEditError("");
    setEditSuccess("");
  };

  // Debounced search for adding new teammates in edit mode
  useEffect(() => {
    if (!editingTeam || !memberSearchQuery || memberSearchQuery.trim().length < 2) {
      setMemberSearchResults([]);
      setMemberSearching(false);
      return;
    }

    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    setMemberSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await callApi<Student[]>({
          action: "searchStudents",
          event_id: editingTeam.event_id,
          query: memberSearchQuery.trim(),
        });

        if (res.ok && res.data) {
          const addedRolls = new Set(editMembers.map((m) => m.roll.toLowerCase()));
          const filtered = res.data.filter((s) => !addedRolls.has(s.roll.toLowerCase()));
          setMemberSearchResults(filtered);
        } else {
          setMemberSearchResults([]);
        }
      } catch (err) {
        setMemberSearchResults([]);
      } finally {
        setMemberSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [memberSearchQuery, editingTeam, editMembers]);

  const handleAddMemberToEdit = (student: Student) => {
    if (!editingTeam) return;

    const maxSize = editingTeam.max_team_size || 10;
    if (editMembers.length >= maxSize) {
      setEditError(`Cannot exceed maximum team size of ${maxSize} members.`);
      return;
    }

    setEditMembers([
      ...editMembers,
      {
        name: student.name,
        roll: student.roll,
        branch: student.branch,
        is_captain: false,
      },
    ]);
    setMemberSearchQuery("");
    setMemberSearchResults([]);
    setEditError("");
  };

  const handleRemoveMemberFromEdit = (roll: string) => {
    // Cannot remove captain
    const target = editMembers.find((m) => m.roll === roll);
    if (target?.is_captain) {
      setEditError("The team captain cannot be removed.");
      return;
    }

    if (!editingTeam) return;
    const minSize = editingTeam.min_team_size || 1;
    if (editMembers.length - 1 < minSize) {
      setEditError(`This event requires a minimum of ${minSize} members.`);
      return;
    }

    setEditMembers(editMembers.filter((m) => m.roll !== roll));
    setEditError("");
  };

  // Save Edit Team
  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !token) return;

    if (!editTeamName.trim() || editTeamName.trim().length < 2) {
      setEditError("Please enter a valid team name.");
      return;
    }

    const minSize = editingTeam.min_team_size || 1;
    const maxSize = editingTeam.max_team_size || 10;

    if (editMembers.length < minSize || editMembers.length > maxSize) {
      setEditError(`Team must have between ${minSize} and ${maxSize} members.`);
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const res = await callApi({
        action: "updateTeam",
        token: token,
        team_id: editingTeam.team_id,
        team_name: editTeamName.trim(),
        members: editMembers,
      });

      if (res.ok) {
        setEditSuccess("Team updated successfully!");
        // Refresh local teams list
        setTeams((prev) =>
          prev.map((t) =>
            t.team_id === editingTeam.team_id
              ? { ...t, team_name: editTeamName.trim(), members: editMembers }
              : t
          )
        );
        setTimeout(() => {
          closeEditModal();
        }, 1200);
      } else {
        setEditError(res.error || "Failed to update team.");
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to save team updates.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("captain_token");
    sessionStorage.removeItem("captain_email");
    sessionStorage.removeItem("captain_name");
    window.dispatchEvent(new Event("storage"));
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-festive-maroon-700" />
        <p className="text-slate-500 text-sm">Loading captain portal & teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Dashboard Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-festive-maroon-100 text-festive-maroon-800 px-2.5 py-0.5 rounded-full">
              Captain Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {captainEmail}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Welcome, {captainName || "Team Captain"} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your registered cultural squads, review team members, and check event schedules.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/register"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-festive-maroon-700 to-festive-saffron-600 shadow-sm hover:opacity-95"
          >
            <Plus className="w-4 h-4 text-festive-gold-300" /> Register Another Team
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === "teams"
              ? "bg-festive-maroon-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          My Teams ({teams.length})
        </button>

        <button
          onClick={() => setActiveTab("notices")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === "notices"
              ? "bg-festive-maroon-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Bell className="w-4 h-4" />
          Notices & Schedules ({notices.length})
        </button>
      </div>

      {/* TAB 1: MY TEAMS */}
      {activeTab === "teams" && (
        <div className="space-y-6">
          {teams.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">No teams registered yet</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  You haven't registered any team under this captain email. Click below to start.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-festive-maroon-700 hover:bg-festive-maroon-800"
              >
                Register Your First Team
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {teams.map((team) => {
                const isDeadlinePassed = Boolean(team.is_locked);

                return (
                  <div
                    key={team.team_id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Team Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-festive-gold-400/20 text-festive-gold-300 border border-festive-gold-400/30">
                            {team.event_name || team.event_id}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            ID: {team.team_id}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                          {team.team_name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        {isDeadlinePassed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <Lock className="w-3.5 h-3.5 text-rose-400" />
                            Locked (Deadline Passed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                            Active & Editable
                          </span>
                        )}

                        {!isDeadlinePassed ? (
                          <button
                            onClick={() => openEditModal(team)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-festive-gold-100 transition shadow"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-festive-maroon-700" />
                            Edit Team
                          </button>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                            title="Editing is locked because deadline has passed"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Locked
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Team Meta & Members */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 border-b border-slate-100 pb-3">
                        <div>
                          Status:{" "}
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {team.status}
                          </span>
                        </div>
                        {team.deadline && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              Deadline:{" "}
                              <strong className="text-slate-700">
                                {new Date(team.deadline).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Members Roster */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Squad Members ({team.members.length} Total)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {team.members.map((member, idx) => (
                            <div
                              key={member.roll}
                              className={`p-3 rounded-2xl border text-xs space-y-1 ${
                                member.is_captain
                                  ? "bg-festive-gold-50/70 border-festive-gold-300 ring-1 ring-festive-gold-200"
                                  : "bg-slate-50/80 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">
                                  {member.name}
                                </span>
                                {member.is_captain && (
                                  <span className="text-[10px] font-bold bg-festive-maroon-700 text-white px-2 py-0.2 rounded-md">
                                    Captain
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 font-mono text-[11px]">
                                Roll: {member.roll}
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Branch: {member.branch}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTICES, SCHEDULE & RESULTS */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-500 text-sm">
              No notices published yet for your events.
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.notice_id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        notice.type === "schedule"
                          ? "bg-sky-100 text-sky-800 border border-sky-200"
                          : notice.type === "result"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-festive-maroon-100 text-festive-maroon-800 border border-festive-maroon-200"
                      }`}
                    >
                      {notice.type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Event: <strong>{notice.event_id}</strong>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(notice.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {notice.title}
                </h3>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {notice.body}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase text-festive-maroon-700">
                  Edit Squad Before Deadline
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {editingTeam.event_name || editingTeam.event_id}
                </h3>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="space-y-5">
              {/* Team Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-sm font-semibold"
                  required
                />
              </div>

              {/* Add Teammate Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Add Registered Classmate (This Event Only)
                  </label>
                  <span className="text-xs font-semibold text-slate-500">
                    Size: {editMembers.length} / {editingTeam.min_team_size || 1}-
                    {editingTeam.max_team_size || 10}
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Roll No or Name..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-festive-maroon-700 text-xs sm:text-sm font-medium"
                  />
                  {memberSearching && (
                    <Loader2 className="w-4 h-4 animate-spin text-festive-maroon-700 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Suggestions List */}
                {memberSearchQuery.trim().length >= 2 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {memberSearchResults.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400 text-center">
                        {memberSearching ? "Searching..." : "No matching registered student found."}
                      </p>
                    ) : (
                      memberSearchResults.map((st) => (
                        <div
                          key={st.roll}
                          className="p-2.5 flex items-center justify-between hover:bg-white transition"
                        >
                          <div className="text-xs">
                            <span className="font-bold text-slate-900">{st.name}</span> (Roll:{" "}
                            {st.roll} | {st.branch})
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddMemberToEdit(st)}
                            className="text-xs font-bold px-2 py-1 rounded bg-festive-maroon-700 text-white hover:bg-festive-maroon-800"
                          >
                            + Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Current Squad Members
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editMembers.map((m) => (
                    <div
                      key={m.roll}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{m.name}</span>
                        {m.is_captain && (
                          <span className="ml-1.5 text-[9px] font-bold bg-festive-maroon-700 text-white px-1.5 py-0.2 rounded">
                            Captain
                          </span>
                        )}
                        <span className="text-slate-500 ml-1">
                          • {m.roll} • {m.branch}
                        </span>
                      </div>

                      {!m.is_captain && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromEdit(m.roll)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove teammate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback messages */}
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-festive-maroon-700 hover:bg-festive-maroon-800 text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Team Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
