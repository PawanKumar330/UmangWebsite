import { ApiResponse, EventItem, Student, Team, Notice } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Detect if real API URL is configured
export const isConfiguredApi = (): boolean => {
  return (
    Boolean(API_URL) &&
    !API_URL.includes("YOUR_APPS_SCRIPT_DEPLOYMENT_ID") &&
    API_URL.startsWith("http")
  );
};

// =========================================================================
// IN-MEMORY MOCK STORE FOR DEMO & PREVIEW
// =========================================================================
let mockEvents: EventItem[] = [
  {
    event_id: "EVT-QUIZ-CROSSWORD",
    event_name: "UMANG 4.0 (Quiz & Crossword)",
    source_sheet_id: "1l67P4UsLjSMcMzvwW9WkN6ONNuUKY5JoM-VCRwDeCBo",
    source_tab_name: "944636428",
    min_team_size: 2,
    max_team_size: 4,
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    is_open: true,
  },
  {
    event_id: "EVT-BATTLE-OF-BANDS",
    event_name: "Battle of Bands (Rock & Fusion)",
    min_team_size: 3,
    max_team_size: 8,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_open: true,
  },
  {
    event_id: "EVT-NATRAJ-GROUP-DANCE",
    event_name: "Natraj - Inter-College Group Dance",
    min_team_size: 4,
    max_team_size: 12,
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    is_open: true,
  },
  {
    event_id: "EVT-RANGMANCH-NUKKAD",
    event_name: "Rangmanch - Nukkad Natak (Street Play)",
    min_team_size: 6,
    max_team_size: 16,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    is_open: true,
  },
  {
    event_id: "EVT-SWAR-VOCAL",
    event_name: "Swar - Classical & Folk Ensemble",
    min_team_size: 2,
    max_team_size: 6,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_open: true,
  },
];

let mockStudents: Record<string, Student[]> = {
  "EVT-QUIZ-CROSSWORD": [
    { name: "Pawan Kumar", roll: "21105128099", branch: "CSE", email_masked: "pk***@gmail.com" },
    { name: "Prashant Kumar", roll: "21105128001", branch: "CSE", email_masked: "pr***@gmail.com" },
    { name: "Ananya Sharma", roll: "21105128014", branch: "ECE", email_masked: "an***@gmail.com" },
    { name: "Aman Raj", roll: "21105128033", branch: "EEE", email_masked: "am***@gmail.com" },
    { name: "Kavita Sinha", roll: "21105128102", branch: "CSE", email_masked: "ka***@gmail.com" },
  ],
  "EVT-BATTLE-OF-BANDS": [
    { name: "Prashant Kumar", roll: "21105128001", branch: "CSE", email_masked: "pr***@gmail.com" },
    { name: "Ananya Sharma", roll: "21105128014", branch: "ECE", email_masked: "an***@gmail.com" },
    { name: "Aman Raj", roll: "21105128033", branch: "EEE", email_masked: "am***@gmail.com" },
    { name: "Rhea Verma", roll: "21105128045", branch: "Civil", email_masked: "rh***@gmail.com" },
    { name: "Vikash Singh", roll: "21105128052", branch: "Mechanical", email_masked: "vi***@gmail.com" },
    { name: "Sneha Kumari", roll: "21105128068", branch: "CSE", email_masked: "sn***@gmail.com" },
  ],
  "EVT-NATRAJ-GROUP-DANCE": [
    { name: "Priya Anand", roll: "21105128088", branch: "ECE", email_masked: "pr***@gmail.com" },
    { name: "Rohit Ranjan", roll: "21105128079", branch: "Civil", email_masked: "ro***@gmail.com" },
    { name: "Kavita Sinha", roll: "21105128102", branch: "CSE", email_masked: "ka***@gmail.com" },
    { name: "Abhinav Mishra", roll: "21105128095", branch: "Mechanical", email_masked: "ab***@gmail.com" },
    { name: "Prashant Kumar", roll: "21105128001", branch: "CSE", email_masked: "pr***@gmail.com" },
    { name: "Ananya Sharma", roll: "21105128014", branch: "ECE", email_masked: "an***@gmail.com" },
  ],
  "EVT-RANGMANCH-NUKKAD": [
    { name: "Vikash Singh", roll: "21105128052", branch: "Mechanical", email_masked: "vi***@gmail.com" },
    { name: "Sneha Kumari", roll: "21105128068", branch: "CSE", email_masked: "sn***@gmail.com" },
    { name: "Rohit Ranjan", roll: "21105128079", branch: "Civil", email_masked: "ro***@gmail.com" },
    { name: "Priya Anand", roll: "21105128088", branch: "ECE", email_masked: "pr***@gmail.com" },
    { name: "Aman Raj", roll: "21105128033", branch: "EEE", email_masked: "am***@gmail.com" },
    { name: "Rhea Verma", roll: "21105128045", branch: "Civil", email_masked: "rh***@gmail.com" },
    { name: "Prashant Kumar", roll: "21105128001", branch: "CSE", email_masked: "pr***@gmail.com" },
  ],
  "EVT-SWAR-VOCAL": [
    { name: "Ananya Sharma", roll: "21105128014", branch: "ECE", email_masked: "an***@gmail.com" },
    { name: "Kavita Sinha", roll: "21105128102", branch: "CSE", email_masked: "ka***@gmail.com" },
    { name: "Prashant Kumar", roll: "21105128001", branch: "CSE", email_masked: "pr***@gmail.com" },
  ],
};

let mockCaptains: { email: string; name: string; pass: string }[] = [
  { email: "prashant.kumar@gmail.com", name: "Prashant Kumar", pass: "fest1234" },
  { email: "priya.anand.fest@gmail.com", name: "Priya Anand", pass: "dance2026" },
];

let mockTeams: Team[] = [
  {
    team_id: "TEAM-ECHOES",
    event_id: "EVT-BATTLE-OF-BANDS",
    event_name: "Battle of Bands (Rock & Fusion)",
    team_name: "The Champaran Grooves",
    captain_email: "prashant.kumar@gmail.com",
    status: "Registered",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_locked: false,
    min_team_size: 3,
    max_team_size: 8,
    members: [
      { name: "Prashant Kumar", roll: "21105128001", branch: "CSE", is_captain: true },
      { name: "Ananya Sharma", roll: "21105128014", branch: "ECE", is_captain: false },
      { name: "Aman Raj", roll: "21105128033", branch: "EEE", is_captain: false },
      { name: "Vikash Singh", roll: "21105128052", branch: "Mechanical", is_captain: false },
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockNotices: Notice[] = [
  {
    notice_id: "NOT-001",
    event_id: "ALL",
    title: "Welcome to UMANG 2026 Team Registration Portal",
    body: "Captains can register their teams for cultural events. Ensure all teammates have filled the individual event form before selecting them.",
    type: "notice",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    notice_id: "NOT-002",
    event_id: "EVT-BATTLE-OF-BANDS",
    title: "Battle of Bands Sound Check Schedule",
    body: "Drum kits and amplifiers will be provided. Personal effect processors and guitars must be tuned by 10 AM.",
    type: "schedule",
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    notice_id: "NOT-003",
    event_id: "EVT-NATRAJ-GROUP-DANCE",
    title: "Natraj Dance Prop Specifications",
    body: "Please confirm with the stage desk if using fire or glass props (strictly prohibited). Water or flower petals require pre-cleaning approval.",
    type: "notice",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

// =========================================================================
// CALL API FUNCTION (WITH APPS SCRIPT POST + DEMO FALLBACK)
// =========================================================================
export async function callApi<T = any>(payload: Record<string, any>): Promise<ApiResponse<T>> {
  // If real API URL is configured, call Google Apps Script Web App
  if (isConfiguredApi()) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json;
    } catch (err: any) {
      console.warn("Apps Script fetch error, checking mock fallback:", err);
      // Fall through to mock handler if desired, or return error
      return { ok: false, error: err.message || "Failed to connect to Apps Script backend." };
    }
  }

  // =======================================================================
  // CLIENT MOCK STORE (Runs smoothly if Apps Script is not yet linked)
  // =======================================================================
  await new Promise((r) => setTimeout(r, 400)); // Simulate realistic network latency

  const action = payload.action;

  switch (action) {
    case "getEvents": {
      const open = mockEvents.filter((e) => e.is_open && new Date(e.deadline).getTime() > Date.now());
      return { ok: true, data: open as unknown as T };
    }

    case "searchStudents": {
      const eventId = payload.event_id;
      const query = (payload.query || "").toLowerCase().trim();
      const list = mockStudents[eventId] || mockStudents["EVT-BATTLE-OF-BANDS"] || [];
      const filtered = list.filter(
        (s) => s.name.toLowerCase().includes(query) || s.roll.toLowerCase().includes(query)
      );
      return { ok: true, data: filtered as unknown as T };
    }

    case "registerTeam": {
      const eventId = payload.event_id;
      const event = mockEvents.find((e) => e.event_id === eventId);
      if (!event) return { ok: false, error: "Event not found." };

      const captainId = (payload.captain_identifier || "").toLowerCase().trim();
      const list = mockStudents[eventId] || mockStudents["EVT-BATTLE-OF-BANDS"] || [];
      const captain = list.find((s) => s.roll.toLowerCase() === captainId || s.name.toLowerCase().includes(captainId));

      if (!captain) {
        return {
          ok: false,
          error: "You are not registered for this event. Fill the individual form first.",
        };
      }

      const teamName = (payload.team_name || "").trim();
      const existingTeam = mockTeams.find(
        (t) => t.event_id === eventId && t.team_name.toLowerCase() === teamName.toLowerCase()
      );
      if (existingTeam) {
        return {
          ok: false,
          error: "A team with this name already exists in this event. Please choose another name.",
        };
      }

      const isNewCaptain = !mockCaptains.some((c) => c.email.toLowerCase() === (captain.roll + "@mce.ac.in").toLowerCase());
      const teamId = "TEAM-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const newTeam: Team = {
        team_id: teamId,
        event_id: eventId,
        event_name: event.event_name,
        team_name: teamName,
        captain_email: captain.roll + "@mce.ac.in",
        status: "Registered",
        deadline: event.deadline,
        is_locked: false,
        min_team_size: event.min_team_size,
        max_team_size: event.max_team_size,
        members: [
          { name: captain.name, roll: captain.roll, branch: captain.branch, is_captain: true },
          ...(payload.members || []).filter((m: any) => m.roll !== captain.roll),
        ],
        created_at: new Date().toISOString(),
      };

      mockTeams.unshift(newTeam);

      if (isNewCaptain) {
        mockCaptains.push({
          email: captain.roll + "@mce.ac.in",
          name: captain.name,
          pass: "mce2026#",
        });
      }

      return {
        ok: true,
        data: {
          team_id: teamId,
          team_name: teamName,
          event_name: event.event_name,
          captain_email: captain.roll + "@mce.ac.in",
          is_new_captain: isNewCaptain,
          message: isNewCaptain
            ? `Registered. Check your email (${captain.roll}@mce.ac.in) for the login password.`
            : `Registered. Confirmation sent to ${captain.roll}@mce.ac.in. Use your existing password.`,
        } as unknown as T,
      };
    }

    case "getNotices": {
      const eventId = payload.event_id;
      let notices = mockNotices;
      if (eventId && eventId !== "ALL") {
        notices = mockNotices.filter((n) => n.event_id === "ALL" || n.event_id === eventId);
      }
      return { ok: true, data: notices as unknown as T };
    }

    case "captainLogin": {
      const email = (payload.email || "").toLowerCase().trim();
      const password = payload.password || "";
      const captain = mockCaptains.find((c) => c.email.toLowerCase() === email && c.pass === password);

      if (!captain && !(email.includes("prashant") && password === "fest1234")) {
        return { ok: false, error: "Invalid email or password." };
      }

      const name = captain ? captain.name : "Prashant Kumar";
      const token = "mock_token_" + btoa(email + ":" + Date.now());

      return {
        ok: true,
        data: {
          token: token,
          captain_name: name,
          captain_email: email,
        } as unknown as T,
      };
    }

    case "getMyTeams": {
      return {
        ok: true,
        data: {
          captain_email: "prashant.kumar@gmail.com",
          teams: mockTeams,
        } as unknown as T,
      };
    }

    case "updateTeam": {
      const teamId = payload.team_id;
      const team = mockTeams.find((t) => t.team_id === teamId);
      if (!team) return { ok: false, error: "Team not found." };
      team.team_name = payload.team_name || team.team_name;
      team.members = payload.members || team.members;
      team.updated_at = new Date().toISOString();
      return { ok: true, data: { message: "Team updated successfully." } as unknown as T };
    }

    case "adminLogin": {
      const pass = payload.password;
      if (pass === "Admin@Umang2026#MCE" || pass === "admin123" || pass === "admin") {
        return {
          ok: true,
          data: {
            token: "mock_admin_token_" + Date.now(),
            role: "admin",
          } as unknown as T,
        };
      }
      return { ok: false, error: "Invalid admin password." };
    }

    case "adminGetEvents": {
      return { ok: true, data: mockEvents as unknown as T };
    }

    case "adminSaveEvent": {
      const eventId = payload.event_id;
      let existing = mockEvents.find((e) => e.event_id === eventId);
      if (existing) {
        existing.event_name = payload.event_name;
        existing.min_team_size = Number(payload.min_team_size);
        existing.max_team_size = Number(payload.max_team_size);
        existing.deadline = payload.deadline;
        existing.is_open = Boolean(payload.is_open);
      } else {
        mockEvents.push({
          event_id: "EVT-" + Date.now(),
          event_name: payload.event_name,
          min_team_size: Number(payload.min_team_size) || 1,
          max_team_size: Number(payload.max_team_size) || 10,
          deadline: payload.deadline || new Date().toISOString(),
          is_open: Boolean(payload.is_open),
        });
      }
      return { ok: true, data: { message: "Event saved successfully." } as unknown as T };
    }

    case "adminGetTeams": {
      let filtered = [...mockTeams];
      if (payload.event_id && payload.event_id !== "ALL") {
        filtered = filtered.filter((t) => t.event_id === payload.event_id);
      }
      if (payload.search) {
        const q = payload.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.team_name.toLowerCase().includes(q) ||
            t.captain_email.toLowerCase().includes(q) ||
            t.members.some((m) => m.name.toLowerCase().includes(q) || m.roll.includes(q))
        );
      }
      return { ok: true, data: filtered as unknown as T };
    }

    case "adminResetPassword": {
      const email = (payload.captain_email || "").toLowerCase().trim();
      return {
        ok: true,
        data: {
          message: `New random password generated and emailed to ${email}.`,
        } as unknown as T,
      };
    }

    case "adminPostNotice": {
      const newNotice: Notice = {
        notice_id: "NOT-" + Date.now(),
        event_id: payload.event_id || "ALL",
        title: payload.title,
        body: payload.body,
        type: payload.type || "notice",
        created_at: new Date().toISOString(),
      };
      mockNotices.unshift(newNotice);
      return { ok: true, data: { message: "Notice posted successfully." } as unknown as T };
    }

    case "adminInspectSourceSheet": {
      return {
        ok: true,
        data: {
          spreadsheet_title: "UMANG 4.0(Quiz& Crossword ) (Responses)",
          sheets: [{ name: "Form Responses 1", gid: "944636428", rows: 45, cols: 6 }],
          target_sheet_name: "Form Responses 1",
          target_sheet_gid: "944636428",
          headers_found: ["Timestamp", "Full Name", "Roll No", "Email Address", "Branch", "WhatsApp No"],
          detected_mapping: {
            name_column: "Full Name (Col 2)",
            roll_column: "Roll No (Col 3)",
            email_column: "Email Address (Col 4)",
            branch_column: "Branch (Col 5)",
          },
          total_students_found: 5,
          sample_students: mockStudents["EVT-QUIZ-CROSSWORD"] || [],
        } as unknown as T,
      };
    }

    default:
      return { ok: false, error: `Unhandled action: ${action}` };
  }
}
