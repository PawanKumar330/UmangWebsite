"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
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
  LogOut,
  Loader2,
  X,
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
        teams: Team[];
        notices: Notice[];
        captain_name: string;
      }>({
        action: "getCaptainDashboard",
        token: currentToken,
      });

      if (res.ok && res.data) {
        setTeams(res.data.teams || []);
        setNotices(res.data.notices || []);
        if (res.data.captain_name) {
          setCaptainName(res.data.captain_name);
        }
      } else {
        setTeams([]);
        setNotices([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal for a team
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.team_name);
    setEditMembers([...team.members]);
    setEditError("");
    setEditSuccess("");
    setMemberSearchQuery("");
    setMemberSearchResults([]);
  };

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

    const maxSize = Number(editingTeam.max_team_size) || 10;
    if (editMembers.length >= maxSize) {
      setEditError(`Cannot exceed maximum squad size of ${maxSize} members.`);
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
    const member = editMembers.find((m) => m.roll === roll);
    if (member?.is_captain) {
      setEditError("The team captain cannot be removed from the squad.");
      return;
    }

    if (!editingTeam) return;
    const minSize = Number(editingTeam.min_team_size) || 1;
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

    const minSize = Number(editingTeam.min_team_size) || 1;
    const maxSize = Number(editingTeam.max_team_size) || 10;

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
        setEditSuccess("Team roster updated successfully.");
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3 text-stone-500">
        <Loader2 className="w-6 h-6 animate-spin text-[#831830]" />
        <p className="text-xs">Loading captain squads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Dashboard Top Header */}
      <div className="bg-white rounded-lg p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
              Captain Portal
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {captainEmail}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-stone-900 mt-1 font-normal">
            Squad Rosters & Schedules
          </h1>
          <p className="text-xs text-stone-600">
            {captainName ? `Captain: ${captainName}` : "Manage registered cultural teams and review stage calls."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Link
            href="/register"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md font-medium text-xs sm:text-sm text-white bg-[#831830] hover:bg-[#6e192c] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-amber-200" /> Register Another Team
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-stone-700 hover:text-rose-700 hover:bg-rose-50 border border-stone-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "teams"
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          My Teams ({teams.length})
        </button>

        <button
          onClick={() => setActiveTab("notices")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "notices"
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Notices & Schedules ({notices.length})
        </button>
      </div>

      {/* TAB 1: MY TEAMS */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {teams.length === 0 ? (
            <div className="bg-white rounded-lg p-10 text-center border border-stone-200 space-y-3">
              <Users className="w-6 h-6 text-stone-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900">No teams registered yet</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  You have not registered any cultural squad under this captain email yet.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-xs text-white bg-[#831830] hover:bg-[#6e192c]"
              >
                Register a Team
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {teams.map((team) => {
                const isDeadlinePassed = Boolean(team.is_locked);

                return (
                  <div
                    key={team.team_id}
                    className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden"
                  >
                    {/* Team Header */}
                    <div className="bg-[#1c1917] text-stone-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700">
                            {team.event_name || team.event_id}
                          </span>
                          <span className="text-xs font-mono text-stone-400">
                            ID: {team.team_id}
                          </span>
                        </div>
                        <h2 className="text-lg font-semibold text-white tracking-tight">
                          {team.team_name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {isDeadlinePassed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-rose-950/60 text-rose-300 border border-rose-800">
                            <Lock className="w-3.5 h-3.5" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                            <Unlock className="w-3.5 h-3.5" /> Editable
                          </span>
                        )}

                        {!isDeadlinePassed ? (
                          <button
                            onClick={() => openEditModal(team)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-stone-100 text-stone-900 hover:bg-white transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#831830]" />
                            Edit Team
                          </button>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-stone-800 text-stone-500 cursor-not-allowed opacity-60"
                            title="Editing is locked because deadline has passed"
                          >
                            <Lock className="w-3.5 h-3.5" /> Locked
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Team Meta & Members */}
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2 border-b border-stone-100 pb-3">
                        <div>
                          Status:{" "}
                          <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {team.status}
                          </span>
                        </div>
                        {team.deadline && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>
                              Deadline:{" "}
                              <strong className="font-medium text-stone-800 tabular-nums">
                                {new Date(team.deadline).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
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
                        <h4 className="text-xs font-medium text-stone-600">
                          Squad Members ({team.members.length} total)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {team.members.map((member) => (
                            <div
                              key={member.roll}
                              className={`p-3 rounded-md border text-xs space-y-1 ${
                                member.is_captain
                                  ? "bg-amber-50/40 border-amber-200"
                                  : "bg-stone-50 border-stone-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-stone-900">
                                  {member.name}
                                </span>
                                {member.is_captain && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                                    Captain
                                  </span>
                                )}
                              </div>
                              <p className="text-stone-500 font-mono text-[11px]">
                                Roll: {member.roll}
                              </p>
                              <p className="text-stone-500 text-[11px]">
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
        <div className="space-y-3.5">
          {notices.length === 0 ? (
            <div className="bg-white rounded-lg p-10 text-center border border-stone-200 text-stone-500 text-xs">
              No notices published yet for your events.
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.notice_id}
                className="bg-white rounded-lg p-5 border border-stone-200 shadow-sm space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        notice.type === "schedule"
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : notice.type === "result"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-stone-100 text-stone-800 border border-stone-200"
                      }`}
                    >
                      {notice.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      Event: <strong>{notice.event_id}</strong>
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

                <h3 className="text-base font-semibold text-stone-900">
                  {notice.title}
                </h3>
                <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
                  {notice.body}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg p-5 sm:p-6 shadow-xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <p className="text-xs font-mono uppercase text-stone-500">
                  Roster Adjustment
                </p>
                <h3 className="text-lg font-semibold text-stone-900">
                  {editingTeam.event_name || editingTeam.event_id}
                </h3>
              </div>
              <button
                onClick={closeEditModal}
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="space-y-4">
              {/* Team Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">
                  Team name
                </label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-sm text-stone-900"
                  required
                />
              </div>

              {/* Add Teammate Search */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-stone-700">
                    Add verified classmate
                  </label>
                  <span className="text-xs font-mono text-stone-500">
                    {editMembers.length} / {editingTeam.min_team_size || 1}–{editingTeam.max_team_size || 10} members
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by roll number or name..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 rounded-md border border-stone-300 focus:outline-none focus:border-[#831830] text-xs sm:text-sm text-stone-900"
                  />
                  {memberSearching && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Suggestions List */}
                {memberSearchQuery.trim().length >= 2 && (
                  <div className="bg-stone-50 border border-stone-200 rounded-md max-h-36 overflow-y-auto divide-y divide-stone-100">
                    {memberSearchResults.length === 0 ? (
                      <p className="p-2.5 text-xs text-stone-500 text-center">
                        {memberSearching ? "Searching..." : "No matching registered student found."}
                      </p>
                    ) : (
                      memberSearchResults.map((st) => (
                        <div
                          key={st.roll}
                          className="p-2 flex items-center justify-between hover:bg-white"
                        >
                          <div className="text-xs">
                            <span className="font-medium text-stone-900">{st.name}</span>{" "}
                            <span className="font-mono text-stone-500 text-[11px]">
                              ({st.roll} • {st.branch})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddMemberToEdit(st)}
                            className="text-xs font-medium px-2 py-0.5 rounded bg-stone-900 text-white hover:bg-stone-800"
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-700">
                  Current squad members
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {editMembers.map((m) => (
                    <div
                      key={m.roll}
                      className="p-2 rounded-md border border-stone-200 bg-stone-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-stone-900">{m.name}</span>
                        {m.is_captain && (
                          <span className="ml-1.5 text-[9px] font-mono px-1 py-0.1 rounded bg-amber-200 text-amber-900">
                            Captain
                          </span>
                        )}
                        <span className="text-stone-500 ml-1 font-mono text-[11px]">
                          • {m.roll} • {m.branch}
                        </span>
                      </div>

                      {!m.is_captain && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromEdit(m.roll)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Remove teammate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback messages */}
              {editError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-2 rounded-md font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 text-xs sm:text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2 rounded-md font-medium text-white bg-[#831830] hover:bg-[#6e192c] text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save roster changes"
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
