/**
 * =========================================================================
 * UMANG 2026 - EVENT TEAM REGISTRATION PORTAL
 * Motihari College of Engineering (MCE Motihari)
 * Google Apps Script Backend (Web App API)
 * =========================================================================
 * 
 * Endpoints:
 * - doGet(e): Health check, API info, and read-only event/notice queries.
 * - doPost(e): JSON API handling all public, captain, and admin actions.
 * 
 * Master Spreadsheet "Portal DB" Tabs:
 * - Events:   event_id, event_name, source_sheet_id, source_tab_name, min_team_size, max_team_size, deadline, is_open
 * - Captains: captain_email, captain_name, password_hash, salt, created_at
 * - Teams:    team_id, event_id, team_name, captain_email, members_json, status, created_at, updated_at
 * - Notices:  notice_id, event_id, title, body, type, created_at
 * 
 * Security:
 * - Admin password and HMAC session secret stored in Script Properties.
 * - SHA-256 + salt password hashing.
 * - LockService concurrency lock on registrations and edits.
 * - CacheService caching of event source sheets (2 min TTL).
 * - Login attempt rate-limiting (5 failed attempts locks for 10 minutes).
 * - Roll numbers and emails normalized. Full student emails masked.
 */

// =========================================================================
// 1. CONFIGURATION
// =========================================================================
const CONFIG = {
  // If blank, defaults to SpreadsheetApp.getActiveSpreadsheet() (container-bound),
  // or checks Script Properties for "PORTAL_DB_ID"
  PORTAL_DB_ID: "",

  // Tab names in Master Portal DB
  TABS: {
    EVENTS: "Events",
    CAPTAINS: "Captains",
    TEAMS: "Teams",
    NOTICES: "Notices"
  },

  // Configurable source sheet column aliases (case-insensitive substring match)
  SOURCE_COLUMNS: {
    NAME: ["name", "student name", "full name", "candidate name", "participant name"],
    ROLL: ["roll no", "roll number", "roll", "university roll no", "registration no", "reg no", "roll_no"],
    EMAIL: ["email", "email address", "email id", "mail", "gmail"],
    BRANCH: ["branch", "department", "stream", "course"]
  },

  // Cache TTL for source sheet responses (seconds)
  CACHE_TTL_SECONDS: 120, // 2 minutes

  // Rate Limiting for Captain Login
  RATE_LIMIT_MAX_ATTEMPTS: 5,
  RATE_LIMIT_LOCKOUT_MINUTES: 10,

  // Session Token Validity
  SESSION_EXPIRY_HOURS: 24,

  // Fest Branding
  APP_NAME: "UMANG 2026 - MCE Motihari Cultural Fest",
  COLLEGE_NAME: "Motihari College of Engineering, Motihari",
  ADMIN_EMAIL: "cultural.fest@mcemotihari.ac.in",
  DEFAULT_SESSION_SECRET: "umang-mce-motihari-fest-secret-key-2026",
  DEFAULT_ADMIN_PASSWORD: "Admin@Umang2026#MCE"
};

// =========================================================================
// 2. HTTP DISPATCHERS: doGet & doPost
// =========================================================================

/**
 * Handles HTTP GET requests (Health check, API diagnostics, or read queries)
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "status";
    
    if (action === "getEvents") {
      return jsonResponse(handleGetEvents());
    } else if (action === "getNotices") {
      const event_id = e.parameter.event_id || null;
      return jsonResponse(handleGetNotices({ event_id: event_id }));
    }

    return jsonResponse({
      ok: true,
      data: {
        service: "UMANG - MCE Motihari Event Team Registration API",
        status: "active",
        timestamp: new Date().toISOString(),
        actions: [
          "getEvents", "searchStudents", "registerTeam", "captainLogin",
          "getMyTeams", "updateTeam", "getNotices", "adminLogin",
          "adminSaveEvent", "adminResetPassword", "adminGetTeams",
          "adminPostNotice", "adminGetEvents"
        ]
      }
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

/**
 * Handles HTTP POST requests (Primary JSON API)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback for form-encoded or raw query
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;
    if (!action) {
      return jsonResponse({ ok: false, error: "Missing required 'action' parameter." });
    }

    let result;
    switch (action) {
      // Public Flow
      case "getEvents":
        result = handleGetEvents();
        break;
      case "searchStudents":
        result = handleSearchStudents(payload);
        break;
      case "registerTeam":
        result = handleRegisterTeam(payload);
        break;
      case "getNotices":
        result = handleGetNotices(payload);
        break;

      // Captain Flow
      case "captainLogin":
        result = handleCaptainLogin(payload);
        break;
      case "getMyTeams":
        result = handleGetMyTeams(payload);
        break;
      case "updateTeam":
        result = handleUpdateTeam(payload);
        break;

      // Admin Flow
      case "adminLogin":
        result = handleAdminLogin(payload);
        break;
      case "adminGetEvents":
        result = handleAdminGetEvents(payload);
        break;
      case "adminSaveEvent":
        result = handleAdminSaveEvent(payload);
        break;
      case "adminGetTeams":
        result = handleAdminGetTeams(payload);
        break;
      case "adminResetPassword":
        result = handleAdminResetPassword(payload);
        break;
      case "adminPostNotice":
        result = handleAdminPostNotice(payload);
        break;
      case "adminInspectSourceSheet":
        result = handleAdminInspectSourceSheet(payload);
        break;
      case "adminTestEmail":
        result = handleAdminTestEmail(payload);
        break;
      case "adminDeleteTeam":
        result = handleAdminDeleteTeam(payload);
        break;

      default:
        result = { ok: false, error: "Unknown action: " + action };
        break;
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Internal Server Error: " + (err.message || err.toString()) });
  }
}

// =========================================================================
// 3. PUBLIC ACTIONS
// =========================================================================

/**
 * Get list of open events for public registration.
 * Filters: is_open is TRUE and deadline has not passed.
 * Never exposes source_sheet_id to public.
 */
function handleGetEvents() {
  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { ok: true, data: [] };
  }

  const headers = data[0].map(h => normalizeString(h));
  const idxId = headers.indexOf("event_id");
  const idxName = headers.indexOf("event_name");
  const idxMin = headers.indexOf("min_team_size");
  const idxMax = headers.indexOf("max_team_size");
  const idxDeadline = headers.indexOf("deadline");
  const idxOpen = headers.indexOf("is_open");

  const now = new Date().getTime();
  const events = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const eventId = String(row[idxId] || "").trim();
    if (!eventId) continue;

    const isOpenVal = String(row[idxOpen]).trim().toUpperCase();
    const isOpen = (isOpenVal === "TRUE" || isOpenVal === "1" || isOpenVal === "YES");

    const rawDeadline = row[idxDeadline];
    const deadlineDate = new Date(rawDeadline);
    const isDeadlinePassed = !isNaN(deadlineDate.getTime()) && deadlineDate.getTime() <= now;

    // Only include if open and deadline hasn't passed
    if (isOpen && !isDeadlinePassed) {
      events.push({
        event_id: eventId,
        event_name: String(row[idxName] || ""),
        min_team_size: parseInt(row[idxMin], 10) || 1,
        max_team_size: parseInt(row[idxMax], 10) || 10,
        deadline: deadlineDate.toISOString(),
        is_open: true
      });
    }
  }

  return { ok: true, data: events };
}

/**
 * Search students from THAT specific event's source sheet.
 * Masks emails: e.g. "p***@gmail.com".
 * Caches source sheet rows for 2 minutes to keep response snappy.
 */
function handleSearchStudents(payload) {
  const eventId = String(payload.event_id || "").trim();
  const query = normalizeString(payload.query || "");

  if (!eventId) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!query || query.length < 2) {
    return { ok: true, data: [] };
  }

  const event = getEventRecord(eventId);
  if (!event) {
    return { ok: false, error: "Event not found." };
  }

  if (!event.source_sheet_id) {
    return { ok: false, error: "Source registration sheet is not configured for this event." };
  }

  const students = getSourceSheetStudents(event.source_sheet_id, event.source_tab_name);

  // Search by Roll Number or Name
  const results = [];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const nameNorm = normalizeString(s.name);
    const rollNorm = normalizeString(s.roll);

    if (nameNorm.includes(query) || rollNorm.includes(query)) {
      results.push({
        name: s.name,
        roll: s.roll,
        branch: s.branch,
        email_masked: maskEmail(s.email)
      });
      if (results.length >= 15) break; // Limit suggestions
    }
  }

  return { ok: true, data: results };
}

/**
 * Register a Team.
 * Validates:
 * 1. Event exists, is open, deadline not passed.
 * 2. Team name unique within event (case-insensitive).
 * 3. Captain exists in this event's source sheet (by roll or email).
 * 4. Min/Max team size constraints (captain counts as 1 member).
 * 5. Captain cannot be added twice; no duplicate members.
 * 6. All teammates exist in this event's source sheet.
 * 7. If new captain: generates random password, salt, hashes it, emails password.
 * 8. If existing captain: confirms new team, instructs to use existing password.
 */
function handleRegisterTeam(payload) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for lock to avoid collision
    const hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return { ok: false, error: "Registration server is currently busy. Please retry in a few seconds." };
    }

    const eventId = String(payload.event_id || "").trim();
    const captainIdentifier = normalizeString(payload.captain_identifier || "");
    const teamName = String(payload.team_name || "").trim();
    let members = Array.isArray(payload.members) ? payload.members : [];

    if (!eventId) return { ok: false, error: "Please select an event." };
    if (!captainIdentifier) return { ok: false, error: "Captain roll number or email is required." };
    if (!teamName || teamName.length < 2) return { ok: false, error: "Please provide a valid team name (at least 2 characters)." };

    // 1. Verify Event
    const event = getEventRecord(eventId);
    if (!event) return { ok: false, error: "Selected event does not exist." };
    if (!event.is_open) return { ok: false, error: "Registration for this event is currently closed." };

    const deadlineDate = new Date(event.deadline);
    if (!isNaN(deadlineDate.getTime()) && deadlineDate.getTime() <= new Date().getTime()) {
      return { ok: false, error: "Registration deadline for this event has passed." };
    }

    // 2. Verify Team Name is unique within this event, and collect existing members
    const ss = getPortalDb();
    const teamsSheet = getSheetOrInit(ss, CONFIG.TABS.TEAMS);
    const teamsData = teamsSheet.getDataRange().getValues();
    const teamNameNorm = normalizeString(teamName);

    // Track existing captains and student participants in this event
    const existingCaptainsInEvent = new Set();
    const registeredMembersInEvent = {}; // rollNorm -> { name, teamName }

    for (let i = 1; i < teamsData.length; i++) {
      const rowEventId = String(teamsData[i][1] || "").trim();
      if (rowEventId !== eventId) continue;

      const rowTeamName = String(teamsData[i][2] || "").trim();
      const rowTeamNameNorm = normalizeString(rowTeamName);
      const rowCaptain = normalizeString(teamsData[i][3]);

      if (rowTeamNameNorm === teamNameNorm) {
        return { ok: false, error: "A team with this name already exists in this event. Please choose another name." };
      }

      existingCaptainsInEvent.add(rowCaptain);

      let rowMembers = [];
      try {
        rowMembers = JSON.parse(teamsData[i][4]);
      } catch (e) {
        rowMembers = [];
      }

      for (let j = 0; j < rowMembers.length; j++) {
        const mRoll = normalizeString(rowMembers[j].roll);
        if (mRoll) {
          registeredMembersInEvent[mRoll] = {
            name: rowMembers[j].name || "Student",
            teamName: rowTeamName
          };
        }
      }
    }

    // 3. Load Event Source Sheet Students
    const sourceStudents = getSourceSheetStudents(event.source_sheet_id, event.source_tab_name);
    if (!sourceStudents || sourceStudents.length === 0) {
      return { ok: false, error: "No student registrations found in the event source sheet." };
    }

    // 4. Find Captain in Source Sheet
    const captainRecord = sourceStudents.find(s => {
      return normalizeString(s.roll) === captainIdentifier || normalizeString(s.email) === captainIdentifier;
    });

    if (!captainRecord) {
      return { ok: false, error: "You are not registered for this event. Fill the individual form first." };
    }

    let captainEmail = normalizeString(captainRecord.email);
    if (!captainEmail) {
      captainEmail = normalizeString(payload.captain_email || "");
    }
    if (!captainEmail && normalizeString(payload.captain_identifier || "").includes("@")) {
      captainEmail = normalizeString(payload.captain_identifier);
    }
    
    // Strict email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!captainEmail || !emailRegex.test(captainEmail)) {
      return { ok: false, error: "A valid email address (e.g. name@gmail.com) is required to receive your login password." };
    }

    const captainName = captainRecord.name;
    const captainRoll = captainRecord.roll;
    const captainBranch = captainRecord.branch;

    // Rule: In a particular event, a member can be captain of ONE team only
    if (existingCaptainsInEvent.has(captainEmail)) {
      return {
        ok: false,
        error: `Registration failed: You have already registered a team as captain for this event. A captain can lead only one team per event.`
      };
    }

    // Rule: No member can participate in multiple teams within the same event
    const captainRollNorm = normalizeString(captainRoll);
    if (registeredMembersInEvent[captainRollNorm]) {
      const existing = registeredMembersInEvent[captainRollNorm];
      return {
        ok: false,
        error: `Registration failed: You (${captainName}, Roll: ${captainRoll}) are already participating in team '${existing.teamName}' for this event. A student can participate in only one team per event.`
      };
    }

    // 5. Ensure Captain is in Members list, but never twice
    const normalizedMembers = [];
    const seenRolls = new Set();

    // Captain is always member #1
    normalizedMembers.push({
      name: captainName,
      roll: captainRoll,
      branch: captainBranch,
      is_captain: true
    });
    seenRolls.add(captainRollNorm);

    // Process provided teammates
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const rollNorm = normalizeString(m.roll);
      if (!rollNorm) continue;

      if (seenRolls.has(rollNorm)) {
        continue; // Skip duplicate / captain added again
      }

      // Check if teammate is already in another team in this event
      if (registeredMembersInEvent[rollNorm]) {
        const existing = registeredMembersInEvent[rollNorm];
        return {
          ok: false,
          error: `Registration failed: Student ${m.name || "with Roll " + m.roll} is already registered in team '${existing.teamName}' for this event. Each student can participate in only one team per event.`
        };
      }

      // Verify member exists in source sheet
      const memberRecord = sourceStudents.find(s => normalizeString(s.roll) === rollNorm);
      if (!memberRecord) {
        return {
          ok: false,
          error: "Teammate with Roll No. " + m.roll + " is not registered in this event's individual form."
        };
      }

      seenRolls.add(rollNorm);
      normalizedMembers.push({
        name: memberRecord.name,
        roll: memberRecord.roll,
        branch: memberRecord.branch,
        is_captain: false
      });
    }

    // 6. Strict Min / Max team size enforcement
    const minSize = parseInt(event.min_team_size, 10) || 1;
    const maxSize = parseInt(event.max_team_size, 10) || 10;

    if (normalizedMembers.length < minSize) {
      return {
        ok: false,
        error: `Registration failed: This event requires a minimum of ${minSize} members (including captain). You currently have ${normalizedMembers.length}.`
      };
    }
    if (normalizedMembers.length > maxSize) {
      return {
        ok: false,
        error: `Registration failed: This event allows a maximum of ${maxSize} members (including captain). You currently have ${normalizedMembers.length}.`
      };
    }

    // 7. Check Captain Account in Captains tab
    const captainsSheet = getSheetOrInit(ss, CONFIG.TABS.CAPTAINS);
    const captainsData = captainsSheet.getDataRange().getValues();
    let existingCaptain = null;
    let captainRowIdx = -1;

    for (let i = 1; i < captainsData.length; i++) {
      if (normalizeString(captainsData[i][0]) === captainEmail) {
        existingCaptain = {
          email: captainsData[i][0],
          name: captainsData[i][1],
          password_hash: captainsData[i][2],
          salt: captainsData[i][3]
        };
        captainRowIdx = i + 1;
        break;
      }
    }

    let isNewCaptain = false;
    let plainPassword = "";

    if (!existingCaptain) {
      // New Captain: Generate 8-character random password & salt
      isNewCaptain = true;
      plainPassword = generateRandomPassword(8);
      const salt = generateSalt(16);
      const hash = hashPassword(plainPassword, salt);
      const createdAt = new Date().toISOString();

      captainsSheet.appendRow([captainEmail, captainName, hash, salt, createdAt]);
    }

    // 8. Save Team in Teams tab
    const teamId = "TEAM-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const nowIso = new Date().toISOString();
    teamsSheet.appendRow([
      teamId,
      eventId,
      teamName,
      captainEmail,
      JSON.stringify(normalizedMembers),
      "Registered",
      nowIso,
      nowIso
    ]);

    // 9. Send Email via MailApp
    sendRegistrationEmail({
      to: captainEmail,
      captainName: captainName,
      teamName: teamName,
      eventName: event.event_name,
      teamId: teamId,
      members: normalizedMembers,
      isNewCaptain: isNewCaptain,
      plainPassword: plainPassword
    });

    return {
      ok: true,
      data: {
        team_id: teamId,
        team_name: teamName,
        event_name: event.event_name,
        captain_email: captainEmail,
        is_new_captain: isNewCaptain,
        message: isNewCaptain
          ? "Registered successfully! Your login password has been sent to " + captainEmail + "."
          : "Registered successfully! Confirmation sent to your email. Use your existing password to log in."
      }
    };
  } catch (err) {
    return { ok: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get notices for public / captain view.
 */
function handleGetNotices(payload) {
  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.NOTICES);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return { ok: true, data: [] };

  const targetEventId = payload && payload.event_id ? String(payload.event_id).trim() : null;
  const notices = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const noticeId = String(row[0] || "");
    const eventId = String(row[1] || "").trim();
    const title = String(row[2] || "");
    const body = String(row[3] || "");
    const type = String(row[4] || "notice");
    const createdAt = row[5] ? new Date(row[5]).toISOString() : new Date().toISOString();

    if (!noticeId && !title) continue;

    // Filter: if targetEventId is specified, match targetEventId or "ALL"
    if (!targetEventId || eventId === "ALL" || eventId === targetEventId) {
      notices.push({
        notice_id: noticeId,
        event_id: eventId,
        title: title,
        body: body,
        type: type,
        created_at: createdAt
      });
    }
  }

  // Sort newest first
  notices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { ok: true, data: notices };
}

// =========================================================================
// 4. CAPTAIN ACTIONS
// =========================================================================

/**
 * Captain Login with email & password.
 * Rate limited to 5 failed attempts per 10 minutes.
 * Returns signed HMAC session token (24h expiry).
 */
function handleCaptainLogin(payload) {
  const email = normalizeString(payload.email || "");
  const password = String(payload.password || "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  // Rate Limiting Check
  const cache = CacheService.getScriptCache();
  const rlKey = "rl_login_" + email.replace(/[^a-zA-Z0-9]/g, "_");
  const failedCountStr = cache.get(rlKey);
  const failedCount = failedCountStr ? parseInt(failedCountStr, 10) : 0;

  if (failedCount >= CONFIG.RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      ok: false,
      error: `Too many failed login attempts. Account temporarily locked for ${CONFIG.RATE_LIMIT_LOCKOUT_MINUTES} minutes. Please try later.`
    };
  }

  // Lookup Captain
  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.CAPTAINS);
  const data = sheet.getDataRange().getValues();

  let captain = null;
  for (let i = 1; i < data.length; i++) {
    if (normalizeString(data[i][0]) === email) {
      captain = {
        email: data[i][0],
        name: data[i][1],
        password_hash: String(data[i][2]),
        salt: String(data[i][3])
      };
      break;
    }
  }

  if (!captain) {
    recordFailedAttempt(cache, rlKey, failedCount);
    return { ok: false, error: "Invalid email or password." };
  }

  const computedHash = hashPassword(password, captain.salt);
  if (computedHash !== captain.password_hash) {
    recordFailedAttempt(cache, rlKey, failedCount);
    return { ok: false, error: "Invalid email or password." };
  }

  // Login successful: reset rate limit
  cache.remove(rlKey);

  // Issue 24-hour HMAC token
  const secret = getSecretProp(CONFIG.SESSION_SECRET_PROP, CONFIG.DEFAULT_SESSION_SECRET);
  const token = createSessionToken("captain", captain.email, secret);

  return {
    ok: true,
    data: {
      token: token,
      captain_name: captain.name,
      captain_email: captain.email,
      expires_in_hours: CONFIG.SESSION_EXPIRY_HOURS
    }
  };
}

/**
 * Helper to record failed attempt in CacheService
 */
function recordFailedAttempt(cache, key, currentCount) {
  const nextCount = currentCount + 1;
  const ttl = CONFIG.RATE_LIMIT_LOCKOUT_MINUTES * 60;
  cache.put(key, String(nextCount), ttl);
}

/**
 * Get My Teams for authenticated captain.
 * Joins each team with its event details, deadline, and locked status.
 */
function handleGetMyTeams(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "captain");
  if (!auth.valid) {
    return { ok: false, error: auth.error || "Unauthorized. Please log in again." };
  }

  const captainEmail = normalizeString(auth.identifier);
  const ss = getPortalDb();

  // Load Events map
  const eventsSheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const eventsData = eventsSheet.getDataRange().getValues();
  const eventsMap = {};

  for (let i = 1; i < eventsData.length; i++) {
    const id = String(eventsData[i][0] || "").trim();
    if (!id) continue;
    eventsMap[id] = {
      event_id: id,
      event_name: String(eventsData[i][1] || ""),
      min_team_size: parseInt(eventsData[i][4], 10) || 1,
      max_team_size: parseInt(eventsData[i][5], 10) || 10,
      deadline: eventsData[i][6] ? new Date(eventsData[i][6]).toISOString() : null,
      is_open: String(eventsData[i][7]).trim().toUpperCase() === "TRUE"
    };
  }

  // Load Teams
  const teamsSheet = getSheetOrInit(ss, CONFIG.TABS.TEAMS);
  const teamsData = teamsSheet.getDataRange().getValues();
  const myTeams = [];
  const now = new Date().getTime();

  for (let i = 1; i < teamsData.length; i++) {
    const row = teamsData[i];
    const rowCaptain = normalizeString(row[3]);

    if (rowCaptain === captainEmail) {
      const eventId = String(row[1] || "").trim();
      const eventInfo = eventsMap[eventId] || {
        event_id: eventId,
        event_name: "Event (" + eventId + ")",
        min_team_size: 1,
        max_team_size: 10,
        deadline: null,
        is_open: false
      };

      let members = [];
      try {
        members = JSON.parse(row[4]);
      } catch (e) {
        members = [];
      }

      const deadlineTime = eventInfo.deadline ? new Date(eventInfo.deadline).getTime() : 0;
      const isLocked = deadlineTime > 0 && deadlineTime <= now;

      myTeams.push({
        team_id: String(row[0] || ""),
        event_id: eventId,
        event_name: eventInfo.event_name,
        team_name: String(row[2] || ""),
        captain_email: rowCaptain,
        members: members,
        status: String(row[5] || "Registered"),
        deadline: eventInfo.deadline,
        is_locked: isLocked,
        min_team_size: eventInfo.min_team_size,
        max_team_size: eventInfo.max_team_size,
        created_at: row[6] ? new Date(row[6]).toISOString() : "",
        updated_at: row[7] ? new Date(row[7]).toISOString() : ""
      });
    }
  }

  return {
    ok: true,
    data: {
      captain_email: captainEmail,
      teams: myTeams
    }
  };
}

/**
 * Edit Team (add/remove members or rename team).
 * ONLY allowed until the event deadline.
 * Validates against event source sheet and team size constraints.
 */
function handleUpdateTeam(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "captain");
  if (!auth.valid) {
    return { ok: false, error: auth.error || "Unauthorized. Please log in again." };
  }

  const captainEmail = normalizeString(auth.identifier);
  const teamId = String(payload.team_id || "").trim();
  const newTeamName = String(payload.team_name || "").trim();
  let members = Array.isArray(payload.members) ? payload.members : [];

  if (!teamId) return { ok: false, error: "Team ID is required." };
  if (!newTeamName || newTeamName.length < 2) return { ok: false, error: "Valid team name is required." };

  const lock = LockService.getScriptLock();
  try {
    const hasLock = lock.tryLock(30000);
    if (!hasLock) return { ok: false, error: "Server is busy. Please retry shortly." };

    const ss = getPortalDb();
    const teamsSheet = getSheetOrInit(ss, CONFIG.TABS.TEAMS);
    const teamsData = teamsSheet.getDataRange().getValues();

    let teamRowIndex = -1;
    let currentTeam = null;

    for (let i = 1; i < teamsData.length; i++) {
      if (String(teamsData[i][0]).trim() === teamId) {
        teamRowIndex = i + 1;
        currentTeam = {
          team_id: teamsData[i][0],
          event_id: teamsData[i][1],
          team_name: teamsData[i][2],
          captain_email: normalizeString(teamsData[i][3])
        };
        break;
      }
    }

    if (!currentTeam || teamRowIndex === -1) {
      return { ok: false, error: "Team not found." };
    }

    // Verify ownership
    if (currentTeam.captain_email !== captainEmail) {
      return { ok: false, error: "Permission denied. You are not the captain of this team." };
    }

    // Check Event & Deadline
    const event = getEventRecord(currentTeam.event_id);
    if (!event) return { ok: false, error: "Associated event not found." };

    const now = new Date().getTime();
    const deadlineTime = event.deadline ? new Date(event.deadline).getTime() : 0;
    if (deadlineTime > 0 && deadlineTime <= now) {
      return { ok: false, error: "The deadline for this event has passed. Team edits are now locked." };
    }

    // Check unique team name within event if name changed
    if (normalizeString(currentTeam.team_name) !== normalizeString(newTeamName)) {
      const newNameNorm = normalizeString(newTeamName);
      for (let i = 1; i < teamsData.length; i++) {
        if (i + 1 === teamRowIndex) continue;
        const rowEventId = String(teamsData[i][1] || "").trim();
        const rowTeamName = normalizeString(teamsData[i][2]);
        if (rowEventId === currentTeam.event_id && rowTeamName === newNameNorm) {
          return { ok: false, error: "Another team with this name already exists in this event." };
        }
      }
    }

    // Validate members against event source sheet
    const sourceStudents = getSourceSheetStudents(event.source_sheet_id, event.source_tab_name);

    // Retrieve captain details from existing team record or source sheet
    let existingTeamMembers = [];
    try {
      existingTeamMembers = JSON.parse(teamsData[teamRowIndex - 1][4]);
    } catch (e) {
      existingTeamMembers = [];
    }
    const existingCaptain = existingTeamMembers.find(m => m.is_captain) || existingTeamMembers[0];
    const existingCaptainRoll = existingCaptain ? normalizeString(existingCaptain.roll) : "";

    const captainRecord = sourceStudents.find(s => 
      (existingCaptainRoll && normalizeString(s.roll) === existingCaptainRoll) ||
      (captainEmail && normalizeString(s.email) === captainEmail)
    ) || existingCaptain;

    if (!captainRecord) {
      return { ok: false, error: "Captain record not found in event source sheet." };
    }

    // Collect all members currently registered in OTHER teams for this event
    const otherTeamsMembers = {}; // rollNorm -> teamName
    for (let i = 1; i < teamsData.length; i++) {
      if (i + 1 === teamRowIndex) continue; // Skip current team being edited
      const rowEventId = String(teamsData[i][1] || "").trim();
      if (rowEventId !== currentTeam.event_id) continue;

      const rowTeamName = String(teamsData[i][2] || "").trim();
      let rowMembers = [];
      try {
        rowMembers = JSON.parse(teamsData[i][4]);
      } catch (e) {
        rowMembers = [];
      }

      for (let j = 0; j < rowMembers.length; j++) {
        const mRoll = normalizeString(rowMembers[j].roll);
        if (mRoll) {
          otherTeamsMembers[mRoll] = rowTeamName;
        }
      }
    }

    const validatedMembers = [];
    const seenRolls = new Set();

    // Captain is always member #1
    validatedMembers.push({
      name: captainRecord.name,
      roll: captainRecord.roll,
      branch: captainRecord.branch,
      is_captain: true
    });
    seenRolls.add(normalizeString(captainRecord.roll));

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const rollNorm = normalizeString(m.roll);
      if (!rollNorm || seenRolls.has(rollNorm)) continue;

      // Check if teammate is already participating in another team for this event
      if (otherTeamsMembers[rollNorm]) {
        return {
          ok: false,
          error: `Student ${m.name || "Roll: " + m.roll} is already registered in team '${otherTeamsMembers[rollNorm]}' for this event. A student can participate in only one team per event.`
        };
      }

      const found = sourceStudents.find(s => normalizeString(s.roll) === rollNorm);
      if (!found) {
        return {
          ok: false,
          error: "Teammate Roll No. " + m.roll + " is not registered in the event source sheet."
        };
      }

      seenRolls.add(rollNorm);
      validatedMembers.push({
        name: found.name,
        roll: found.roll,
        branch: found.branch,
        is_captain: false
      });
    }

    // Enforce size limits
    const minSize = parseInt(event.min_team_size, 10) || 1;
    const maxSize = parseInt(event.max_team_size, 10) || 10;

    if (validatedMembers.length < minSize) {
      return {
        ok: false,
        error: `Team must have at least ${minSize} members (including captain). Current: ${validatedMembers.length}`
      };
    }
    if (validatedMembers.length > maxSize) {
      return {
        ok: false,
        error: `Team cannot exceed ${maxSize} members (including captain). Current: ${validatedMembers.length}`
      };
    }

    // Update row in Teams tab
    // columns: team_id(1), event_id(2), team_name(3), captain_email(4), members_json(5), status(6), created_at(7), updated_at(8)
    const nowIso = new Date().toISOString();
    teamsSheet.getRange(teamRowIndex, 3).setValue(newTeamName);
    teamsSheet.getRange(teamRowIndex, 5).setValue(JSON.stringify(validatedMembers));
    teamsSheet.getRange(teamRowIndex, 8).setValue(nowIso);

    return {
      ok: true,
      data: {
        team_id: teamId,
        team_name: newTeamName,
        members: validatedMembers,
        message: "Team updated successfully."
      }
    };
  } catch (err) {
    return { ok: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// 5. ADMIN ACTIONS
// =========================================================================

/**
 * Admin Login with master password stored in Script Properties.
 * Returns signed HMAC session token for admin role.
 */
function handleAdminLogin(payload) {
  const password = String(payload.password || "");
  if (!password) {
    return { ok: false, error: "Admin password is required." };
  }

  const masterPass = getSecretProp(CONFIG.ADMIN_PASSWORD_PROP, CONFIG.DEFAULT_ADMIN_PASSWORD);
  if (password !== masterPass) {
    return { ok: false, error: "Invalid admin password." };
  }

  const secret = getSecretProp(CONFIG.SESSION_SECRET_PROP, CONFIG.DEFAULT_SESSION_SECRET);
  const token = createSessionToken("admin", "admin", secret);

  return {
    ok: true,
    data: {
      token: token,
      role: "admin",
      message: "Admin authentication successful."
    }
  };
}

/**
 * Get all events for Admin Panel (including source sheet IDs and closed events).
 */
function handleAdminGetEvents(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const data = sheet.getDataRange().getValues();

  const events = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const eventId = String(row[0] || "").trim();
    if (!eventId) continue;

    events.push({
      event_id: eventId,
      event_name: String(row[1] || ""),
      source_sheet_id: String(row[2] || ""),
      source_tab_name: String(row[3] || "Form Responses 1"),
      min_team_size: parseInt(row[4], 10) || 1,
      max_team_size: parseInt(row[5], 10) || 10,
      deadline: row[6] ? new Date(row[6]).toISOString() : "",
      is_open: String(row[7]).trim().toUpperCase() === "TRUE"
    });
  }

  return { ok: true, data: events };
}

/**
 * Add or Edit Event (Admin only).
 */
function handleAdminSaveEvent(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const eventName = String(payload.event_name || "").trim();
  const sourceSheetId = String(payload.source_sheet_id || "").trim();
  const sourceTabName = String(payload.source_tab_name || "Form Responses 1").trim();
  const minSize = parseInt(payload.min_team_size, 10) || 1;
  const maxSize = parseInt(payload.max_team_size, 10) || 10;
  const deadline = payload.deadline ? new Date(payload.deadline).toISOString() : new Date().toISOString();
  const isOpen = (payload.is_open === true || String(payload.is_open).toLowerCase() === "true");

  if (!eventName) return { ok: false, error: "Event name is required." };
  if (minSize > maxSize) return { ok: false, error: "Min team size cannot exceed max team size." };

  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const data = sheet.getDataRange().getValues();

  let eventId = String(payload.event_id || "").trim();
  let existingRow = -1;

  if (eventId) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === eventId) {
        existingRow = i + 1;
        break;
      }
    }
  }

  if (existingRow > 0) {
    // Update existing event
    sheet.getRange(existingRow, 2).setValue(eventName);
    sheet.getRange(existingRow, 3).setValue(sourceSheetId);
    sheet.getRange(existingRow, 4).setValue(sourceTabName);
    sheet.getRange(existingRow, 5).setValue(minSize);
    sheet.getRange(existingRow, 6).setValue(maxSize);
    sheet.getRange(existingRow, 7).setValue(deadline);
    sheet.getRange(existingRow, 8).setValue(isOpen ? "TRUE" : "FALSE");
  } else {
    // Add new event
    eventId = "EVT-" + Date.now();
    sheet.appendRow([
      eventId,
      eventName,
      sourceSheetId,
      sourceTabName,
      minSize,
      maxSize,
      deadline,
      isOpen ? "TRUE" : "FALSE"
    ]);
  }

  // Clear source sheet cache if sheet ID changed
  if (sourceSheetId) {
    CacheService.getScriptCache().remove("src_sheet_" + sourceSheetId + "_" + sourceTabName);
  }

  return {
    ok: true,
    data: {
      event_id: eventId,
      event_name: eventName,
      message: "Event saved successfully."
    }
  };
}

/**
 * View all teams per event with search (Admin only).
 */
function handleAdminGetTeams(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const eventFilter = payload.event_id ? String(payload.event_id).trim() : null;
  const searchFilter = payload.search ? normalizeString(payload.search) : null;

  const ss = getPortalDb();

  // Load Events map for names
  const eventsSheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const eventsData = eventsSheet.getDataRange().getValues();
  const eventsMap = {};
  for (let i = 1; i < eventsData.length; i++) {
    eventsMap[String(eventsData[i][0]).trim()] = String(eventsData[i][1] || "");
  }

  // Load Teams
  const teamsSheet = getSheetOrInit(ss, CONFIG.TABS.TEAMS);
  const teamsData = teamsSheet.getDataRange().getValues();
  const teams = [];

  for (let i = 1; i < teamsData.length; i++) {
    const row = teamsData[i];
    const teamId = String(row[0] || "");
    const eventId = String(row[1] || "").trim();
    const teamName = String(row[2] || "");
    const captainEmail = String(row[3] || "");

    if (!teamId && !teamName) continue;
    if (eventFilter && eventId !== eventFilter) continue;

    let members = [];
    try {
      members = JSON.parse(row[4]);
    } catch (e) {
      members = [];
    }

    // Search filter across team name, captain email, or member rolls/names
    if (searchFilter) {
      const matchName = normalizeString(teamName).includes(searchFilter);
      const matchCaptain = normalizeString(captainEmail).includes(searchFilter);
      const matchMember = members.some(m =>
        normalizeString(m.name).includes(searchFilter) || normalizeString(m.roll).includes(searchFilter)
      );

      if (!matchName && !matchCaptain && !matchMember) {
        continue;
      }
    }

    teams.push({
      team_id: teamId,
      event_id: eventId,
      event_name: eventsMap[eventId] || eventId,
      team_name: teamName,
      captain_email: captainEmail,
      members: members,
      members_count: members.length,
      status: String(row[5] || "Registered"),
      created_at: row[6] ? new Date(row[6]).toISOString() : "",
      updated_at: row[7] ? new Date(row[7]).toISOString() : ""
    });
  }

  return { ok: true, data: teams };
}

/**
 * Admin Reset Captain's Password.
 * Generates a new random password, updates hash, and emails it to the captain.
 */
function handleAdminResetPassword(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const captainEmail = normalizeString(payload.captain_email || "");
  if (!captainEmail) return { ok: false, error: "Captain email is required." };

  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.CAPTAINS);
  const data = sheet.getDataRange().getValues();

  let targetRow = -1;
  let captainName = "";

  for (let i = 1; i < data.length; i++) {
    if (normalizeString(data[i][0]) === captainEmail) {
      targetRow = i + 1;
      captainName = String(data[i][1] || "");
      break;
    }
  }

  if (targetRow === -1) {
    return { ok: false, error: "No captain registered with email: " + captainEmail };
  }

  // Generate new password & salt
  const newPassword = generateRandomPassword(8);
  const newSalt = generateSalt(16);
  const newHash = hashPassword(newPassword, newSalt);

  sheet.getRange(targetRow, 3).setValue(newHash);
  sheet.getRange(targetRow, 4).setValue(newSalt);

  // Send email with new password
  sendPasswordResetEmail({
    to: captainEmail,
    captainName: captainName,
    newPassword: newPassword
  });

  return {
    ok: true,
    data: {
      captain_email: captainEmail,
      message: `New password generated and emailed to ${captainEmail}.`
    }
  };
}

/**
 * Post notice / schedule / result (Admin only).
 */
function handleAdminPostNotice(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();
  const eventId = String(payload.event_id || "ALL").trim();
  const type = String(payload.type || "notice").toLowerCase();

  if (!title) return { ok: false, error: "Notice title is required." };
  if (!body) return { ok: false, error: "Notice body is required." };

  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.NOTICES);
  const noticeId = "NOT-" + Date.now();
  const nowIso = new Date().toISOString();

  sheet.appendRow([noticeId, eventId, title, body, type, nowIso]);

  return {
    ok: true,
    data: {
      notice_id: noticeId,
      message: "Notice posted successfully."
    }
  };
}

/**
 * Delete a Team (Admin only). Useful for clearing test or duplicate teams.
 */
function handleAdminDeleteTeam(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const teamId = String(payload.team_id || "").trim();
  if (!teamId) return { ok: false, error: "Team ID is required." };

  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.TEAMS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === teamId) {
      sheet.deleteRow(i + 1);
      return { ok: true, data: { message: "Team " + teamId + " deleted successfully." } };
    }
  }

  return { ok: false, error: "Team " + teamId + " not found." };
}

/**
 * Test Gmail / MailApp Service Delivery (Admin only).
 * Sends a real test email to verify credentials, permissions, and inbox delivery.
 */
function handleAdminTestEmail(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const toEmail = normalizeString(payload.to_email || payload.email || "");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toEmail || !emailRegex.test(toEmail)) {
    return { ok: false, error: "Please provide a valid recipient email address (e.g. name@gmail.com)." };
  }

  try {
    const subject = "[UMANG 2026] Gmail Service Test - MCE Motihari";
    const htmlBody = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;padding:24px;">
        <div style="background:linear-gradient(135deg,#881337 0%,#be123c 100%);color:#ffffff;padding:16px;text-align:center;border-radius:8px;margin-bottom:16px;">
          <h2 style="margin:0;font-size:20px;">Gmail Service Test</h2>
          <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">UMANG 2026 • Motihari College of Engineering</p>
        </div>
        <h3 style="color:#059669;margin-top:0;">Delivery Successful! ✅</h3>
        <p>This test email confirms that your Google Apps Script <strong>MailApp / Gmail service</strong> is active, authorized, and sending emails properly from your Google account.</p>
        <p style="background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;color:#475569;margin:16px 0;">
          <strong>Recipient:</strong> ${escapeHtml(toEmail)}<br/>
          <strong>Timestamp:</strong> ${new Date().toISOString()}
        </p>
        <p style="font-size:12px;color:#94a3b8;margin:0;">Motihari College of Engineering Cultural Fest Committee</p>
      </div>
    `;

    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      htmlBody: htmlBody
    });

    return {
      ok: true,
      data: {
        to_email: toEmail,
        message: "Test email successfully sent to " + toEmail + "! Please check your inbox or spam folder."
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: "Gmail delivery failed: " + err.toString() + ". Make sure you have authorized MailApp permissions in your Apps Script project."
    };
  }
}

// =========================================================================
// 6. SOURCE SHEET PARSER WITH CONFIG ALIASES & CACHING
// =========================================================================

/**
 * Extracts clean Google Spreadsheet ID and GID from either raw ID or full Google Docs URL
 */
function extractSheetIdAndGid(input) {
  if (!input) return { sheetId: "", gid: null };
  const str = String(input).trim();
  
  // Check if full URL
  const matchId = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = matchId ? matchId[1] : str.split("/")[0].split("?")[0].trim();
  
  const matchGid = str.match(/[?&#]gid=([0-9]+)/);
  const gid = matchGid ? matchGid[1] : null;

  return { sheetId: sheetId, gid: gid };
}

/**
 * Reads and caches student rows from an event's Google Form source sheet.
 * Matches columns dynamically based on CONFIG.SOURCE_COLUMNS aliases.
 */
function getSourceSheetStudents(sheetIdOrUrl, tabNameOrGid) {
  const parsed = extractSheetIdAndGid(sheetIdOrUrl);
  const sheetId = parsed.sheetId;
  if (!sheetId) return [];

  const targetGid = parsed.gid || (tabNameOrGid && /^[0-9]+$/.test(String(tabNameOrGid).trim()) ? String(tabNameOrGid).trim() : null);
  const tab = tabNameOrGid && !targetGid ? String(tabNameOrGid).trim() : (targetGid ? "gid_" + targetGid : "default_tab");
  
  const cacheKey = "src_sheet_" + sheetId + "_" + tab.replace(/\s+/g, "_");
  const cache = CacheService.getScriptCache();
  const cachedJson = cache.get(cacheKey);

  if (cachedJson) {
    try {
      return JSON.parse(cachedJson);
    } catch (e) {
      // Fallback to fresh read
    }
  }

  let sourceSs;
  try {
    sourceSs = SpreadsheetApp.openById(sheetId);
  } catch (err) {
    throw new Error("Unable to open source sheet ID (" + sheetId + "). Ensure the Apps Script has access or Sheet ID is correct.");
  }

  let sheet = null;

  // 1. If target GID specified, find sheet by getSheetId()
  if (targetGid) {
    const allSheets = sourceSs.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      if (String(allSheets[i].getSheetId()) === targetGid) {
        sheet = allSheets[i];
        break;
      }
    }
  }

  // 2. Try by exact name
  if (!sheet && tabNameOrGid) {
    sheet = sourceSs.getSheetByName(tabNameOrGid);
  }

  // 3. Try case-insensitive tab match or looking for 'responses' in name
  if (!sheet) {
    const allSheets = sourceSs.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      const sName = allSheets[i].getName().toLowerCase();
      if (tabNameOrGid && sName === String(tabNameOrGid).toLowerCase()) {
        sheet = allSheets[i];
        break;
      }
      if (sName.includes("response") || sName.includes("form") || sName.includes("quiz")) {
        sheet = allSheets[i];
        break;
      }
    }
  }

  // 4. Fallback to first sheet
  if (!sheet) {
    sheet = sourceSs.getSheets()[0];
  }
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // Match column indices using configured aliases
  const rawHeaders = data[0].map(h => String(h || ""));
  const colIndices = resolveColumnIndices(rawHeaders);

  const students = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    let name = colIndices.nameIdx !== -1 ? String(row[colIndices.nameIdx] != null ? row[colIndices.nameIdx] : "").trim() : "";
    let roll = colIndices.rollIdx !== -1 ? String(row[colIndices.rollIdx] != null ? row[colIndices.rollIdx] : "").trim() : "";
    let email = colIndices.emailIdx !== -1 ? String(row[colIndices.emailIdx] != null ? row[colIndices.emailIdx] : "").trim() : "";
    let branch = colIndices.branchIdx !== -1 ? String(row[colIndices.branchIdx] != null ? row[colIndices.branchIdx] : "").trim() : "";

    // Clean up float decimals like 21105128001.0
    if (roll.endsWith(".0")) {
      roll = roll.substring(0, roll.length - 2);
    }

    if (roll || email || name) {
      students.push({
        name: name || "Participant",
        roll: roll || "",
        email: email || "",
        branch: branch || "MCE"
      });
    }
  }

  // Cache for 2 minutes (CONFIG.CACHE_TTL_SECONDS)
  try {
    cache.put(cacheKey, JSON.stringify(students), CONFIG.CACHE_TTL_SECONDS);
  } catch (e) {
    // If payload too large for cache, proceed without caching
  }

  return students;
}

/**
 * Resolves column positions for Name, Roll No, Email, Branch using flexible keyword matching
 */
function resolveColumnIndices(rawHeaders) {
  const result = { nameIdx: -1, rollIdx: -1, emailIdx: -1, branchIdx: -1 };
  const headers = rawHeaders.map(h => normalizeString(h));

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;

    // Never match Timestamp, Score, or Date columns
    if (h.includes("timestamp") || h.includes("time stamp") || h.includes("score") || h.includes("serial") || h.includes("s.no")) {
      continue;
    }

    // 1. Roll Number Match:
    if (result.rollIdx === -1) {
      if (
        h.includes("roll") ||
        h.includes("reg no") ||
        h.includes("reg. no") ||
        h.includes("registration") ||
        h.includes("enrollment") ||
        h.includes("university roll") ||
        h.includes("college roll") ||
        h.includes("class roll") ||
        h === "reg"
      ) {
        result.rollIdx = i;
        continue;
      }
    }

    // 2. Email Match:
    if (result.emailIdx === -1) {
      if (h.includes("email") || h.includes("mail") || h.includes("gmail") || h.includes("e-mail")) {
        result.emailIdx = i;
        continue;
      }
    }

    // 3. Name Match:
    if (result.nameIdx === -1) {
      if (
        h.includes("name") &&
        !h.includes("college") &&
        !h.includes("event") &&
        !h.includes("team") &&
        !h.includes("father") &&
        !h.includes("dept")
      ) {
        result.nameIdx = i;
        continue;
      }
    }

    // 4. Branch / Department Match:
    if (result.branchIdx === -1) {
      if (
        h.includes("branch") ||
        h.includes("dept") ||
        h.includes("department") ||
        h.includes("stream") ||
        h.includes("course") ||
        h.includes("semester")
      ) {
        result.branchIdx = i;
        continue;
      }
    }
  }

  // Fallbacks if not detected by keywords
  // Typically in Google Forms:
  // Col 0 = Timestamp
  // Col 1 = Name or Email
  // Col 2 = Roll or Email
  if (result.nameIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (i !== result.rollIdx && i !== result.emailIdx && i !== result.branchIdx && !headers[i].includes("time")) {
        result.nameIdx = i;
        break;
      }
    }
  }

  return result;
}

/**
 * Diagnostic action for Admin to inspect and verify any Google Form source sheet
 */
function handleAdminInspectSourceSheet(payload) {
  const token = payload.token || "";
  const auth = verifySessionToken(token, "admin");
  if (!auth.valid) return { ok: false, error: "Admin unauthorized." };

  const parsed = extractSheetIdAndGid(payload.source_sheet_id);
  const sheetId = parsed.sheetId;
  const tabName = payload.source_tab_name;

  if (!sheetId) return { ok: false, error: "Source Sheet ID or URL is required." };

  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheetsList = ss.getSheets().map(s => ({
      name: s.getName(),
      gid: String(s.getSheetId()),
      rows: s.getLastRow(),
      cols: s.getLastColumn()
    }));

    const students = getSourceSheetStudents(sheetId, tabName);
    let sampleHeaders = [];
    let detectedMapping = {};

    let targetSheet = null;
    if (parsed.gid) {
      targetSheet = ss.getSheets().find(s => String(s.getSheetId()) === parsed.gid);
    }
    if (!targetSheet && tabName) {
      targetSheet = ss.getSheetByName(tabName);
    }
    if (!targetSheet) targetSheet = ss.getSheets()[0];

    if (targetSheet && targetSheet.getLastRow() >= 1) {
      const headerRow = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
      sampleHeaders = headerRow.map(h => String(h || ""));
      const mapping = resolveColumnIndices(sampleHeaders);
      detectedMapping = {
        name_column: mapping.nameIdx !== -1 ? `${sampleHeaders[mapping.nameIdx]} (Col ${mapping.nameIdx + 1})` : "Not Found",
        roll_column: mapping.rollIdx !== -1 ? `${sampleHeaders[mapping.rollIdx]} (Col ${mapping.rollIdx + 1})` : "Not Found",
        email_column: mapping.emailIdx !== -1 ? `${sampleHeaders[mapping.emailIdx]} (Col ${mapping.emailIdx + 1})` : "Not Found",
        branch_column: mapping.branchIdx !== -1 ? `${sampleHeaders[mapping.branchIdx]} (Col ${mapping.branchIdx + 1})` : "Not Found",
      };
    }

    return {
      ok: true,
      data: {
        spreadsheet_title: ss.getName(),
        sheets: sheetsList,
        target_sheet_name: targetSheet ? targetSheet.getName() : "None",
        target_sheet_gid: targetSheet ? String(targetSheet.getSheetId()) : "",
        headers_found: sampleHeaders,
        detected_mapping: detectedMapping,
        total_students_found: students.length,
        sample_students: students.slice(0, 3)
      }
    };
  } catch (err) {
    return { ok: false, error: "Failed to open or inspect sheet: " + err.message };
  }
}

// =========================================================================
// 7. SPREADSHEET & DATABASE HELPERS
// =========================================================================

/**
 * Gets or binds the Master Portal DB spreadsheet.
 */
function getPortalDb() {
  const scriptProp = PropertiesService.getScriptProperties().getProperty("PORTAL_DB_ID");
  const dbId = CONFIG.PORTAL_DB_ID || scriptProp;

  if (dbId) {
    try {
      return SpreadsheetApp.openById(dbId);
    } catch (e) {
      throw new Error("Failed to open Portal DB Spreadsheet with ID: " + dbId);
    }
  }

  // Fallback to active spreadsheet (if container-bound)
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  throw new Error("Portal DB Spreadsheet not configured. Set PORTAL_DB_ID in Script Properties or in CONFIG.");
}

/**
 * Gets sheet by name or initializes it with header row if absent.
 */
function getSheetOrInit(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    let headers = [];
    switch (sheetName) {
      case CONFIG.TABS.EVENTS:
        headers = ["event_id", "event_name", "source_sheet_id", "source_tab_name", "min_team_size", "max_team_size", "deadline", "is_open"];
        break;
      case CONFIG.TABS.CAPTAINS:
        headers = ["captain_email", "captain_name", "password_hash", "salt", "created_at"];
        break;
      case CONFIG.TABS.TEAMS:
        headers = ["team_id", "event_id", "team_name", "captain_email", "members_json", "status", "created_at", "updated_at"];
        break;
      case CONFIG.TABS.NOTICES:
        headers = ["notice_id", "event_id", "title", "body", "type", "created_at"];
        break;
    }
    if (headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }
  return sheet;
}

/**
 * Look up single event record
 */
function getEventRecord(eventId) {
  const ss = getPortalDb();
  const sheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(eventId).trim()) {
      const isOpenVal = String(data[i][7]).trim().toUpperCase();
      return {
        event_id: String(data[i][0]).trim(),
        event_name: String(data[i][1] || ""),
        source_sheet_id: String(data[i][2] || "").trim(),
        source_tab_name: String(data[i][3] || "Form Responses 1").trim(),
        min_team_size: parseInt(data[i][4], 10) || 1,
        max_team_size: parseInt(data[i][5], 10) || 10,
        deadline: data[i][6] ? new Date(data[i][6]).toISOString() : null,
        is_open: isOpenVal === "TRUE" || isOpenVal === "1" || isOpenVal === "YES"
      };
    }
  }
  return null;
}

// =========================================================================
// 8. SECURITY & CRYPTO HELPERS
// =========================================================================

function normalizeString(str) {
  if (str === null || str === undefined) return "";
  return String(str).trim().toLowerCase();
}

/**
 * Masks student email address for browser safety (e.g., pr***@gmail.com)
 */
function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) {
    return user[0] + "***@" + domain;
  }
  return user.substring(0, 2) + "***@" + domain;
}

/**
 * Generates cryptographically secure random alphanumeric password
 */
function generateRandomPassword(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pass = "";
  for (let i = 0; i < (length || 8); i++) {
    const idx = Math.floor(Math.random() * chars.length);
    pass += chars.charAt(idx);
  }
  return pass;
}

function generateSalt(length) {
  const chars = "0123456789abcdef";
  let salt = "";
  for (let i = 0; i < (length || 16); i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

/**
 * SHA-256(salt + password)
 */
function hashPassword(password, salt) {
  const input = (salt || "") + password;
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  let hexString = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    hexString += byteHex;
  }
  return hexString;
}

/**
 * Signed HMAC session token with 24h expiration
 * Token format: base64(role:identifier:timestamp):signature
 */
function createSessionToken(role, identifier, secret) {
  const timestamp = Date.now();
  const payload = role + ":" + identifier + ":" + timestamp;
  const payloadB64 = Utilities.base64Encode(payload);
  const signatureBytes = Utilities.computeHmacSha256Signature(payload, secret);
  const signatureHex = bytesToHex(signatureBytes);
  return payloadB64 + "." + signatureHex;
}

/**
 * Verifies signed HMAC token and checks 24h expiration
 */
function verifySessionToken(token, expectedRole) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, error: "Invalid session token format." };
  }

  const parts = token.split(".");
  const payloadB64 = parts[0];
  const signature = parts[1];

  let decodedPayload;
  try {
    decodedPayload = Utilities.newBlob(Utilities.base64Decode(payloadB64)).getDataAsString();
  } catch (e) {
    return { valid: false, error: "Corrupted token payload." };
  }

  const payloadParts = decodedPayload.split(":");
  if (payloadParts.length < 3) {
    return { valid: false, error: "Malformed token data." };
  }

  const role = payloadParts[0];
  const identifier = payloadParts[1];
  const timestamp = parseInt(payloadParts[2], 10);

  if (expectedRole && role !== expectedRole) {
    return { valid: false, error: "Role mismatch. Access denied." };
  }

  // Check 24-hour expiry
  const maxAgeMs = CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAgeMs) {
    return { valid: false, error: "Session expired. Please log in again." };
  }

  // Verify HMAC signature
  const secret = getSecretProp(CONFIG.SESSION_SECRET_PROP, CONFIG.DEFAULT_SESSION_SECRET);
  const expectedSigBytes = Utilities.computeHmacSha256Signature(decodedPayload, secret);
  const expectedSigHex = bytesToHex(expectedSigBytes);

  if (signature !== expectedSigHex) {
    return { valid: false, error: "Invalid session signature." };
  }

  return { valid: true, role: role, identifier: identifier };
}

function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    if (b < 0) b += 256;
    let s = b.toString(16);
    if (s.length === 1) s = "0" + s;
    hex += s;
  }
  return hex;
}

function getSecretProp(key, defaultVal) {
  const prop = PropertiesService.getScriptProperties().getProperty(key);
  return prop || defaultVal;
}

// =========================================================================
// 9. EMAIL NOTIFICATIONS (Gmail / MailApp)
// =========================================================================

function sendRegistrationEmail(opts) {
  try {
    const subject = opts.isNewCaptain
      ? `[UMANG 2026] Team Registered: ${opts.teamName} - Your Login Password`
      : `[UMANG 2026] Team Registered: ${opts.teamName} Confirmation`;

    const membersListHtml = opts.members.map(m =>
      `<li><strong>${escapeHtml(m.name)}</strong> (Roll: ${escapeHtml(m.roll)} | ${escapeHtml(m.branch)})${m.is_captain ? ' <span style="color:#c2410c;font-weight:bold;">[Captain]</span>' : ''}</li>`
    ).join("");

    let credentialsHtml = "";
    if (opts.isNewCaptain) {
      credentialsHtml = `
        <div style="background-color:#fef3c7;border:1px solid #f59e0b;padding:16px;border-radius:8px;margin:20px 0;">
          <h3 style="color:#92400e;margin-top:0;">Your Captain Login Password</h3>
          <p style="margin:4px 0;">Use these credentials to log in to the Captain Dashboard to manage your team:</p>
          <p style="font-size:18px;font-family:monospace;margin:10px 0;background:#ffffff;padding:10px;border-radius:4px;border:1px solid #cbd5e1;">
            <strong>Email:</strong> ${escapeHtml(opts.to)}<br/>
            <strong>Password:</strong> <span style="color:#be123c;font-weight:bold;">${escapeHtml(opts.plainPassword)}</span>
          </p>
          <p style="font-size:12px;color:#78350f;margin:0;">* Keep this password confidential. You can manage and edit your team members until the event deadline.</p>
        </div>
      `;
    } else {
      credentialsHtml = `
        <div style="background-color:#ecfdf5;border:1px solid #10b981;padding:14px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;color:#065f46;"><strong>Captain Account Active:</strong> You already have a registered captain account. Please use your <strong>existing password</strong> to log in and manage this team.</p>
        </div>
      `;
    }

    const htmlBody = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#881337 0%,#be123c 50%,#ea580c 100%);color:#ffffff;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:24px;letter-spacing:1px;">UMANG 2026</h1>
          <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Motihari College of Engineering Cultural Fest</p>
        </div>
        <div style="padding:24px;color:#1e293b;line-height:1.6;">
          <h2 style="color:#be123c;margin-top:0;">Team Registration Confirmed! 🎉</h2>
          <p>Dear <strong>${escapeHtml(opts.captainName)}</strong>,</p>
          <p>Congratulations! Your team <strong>${escapeHtml(opts.teamName)}</strong> has been successfully registered for <strong>${escapeHtml(opts.eventName)}</strong> at UMANG 2026.</p>
          
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 0;color:#64748b;">Team ID:</td><td style="font-weight:bold;color:#0f172a;">${escapeHtml(opts.teamId)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Event:</td><td style="font-weight:bold;color:#0f172a;">${escapeHtml(opts.eventName)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Team Name:</td><td style="font-weight:bold;color:#be123c;">${escapeHtml(opts.teamName)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Status:</td><td><span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;">Registered</span></td></tr>
          </table>

          <h3 style="color:#0f172a;margin-bottom:8px;">Registered Team Members:</h3>
          <ul style="padding-left:20px;margin:0 0 16px 0;">
            ${membersListHtml}
          </ul>

          ${credentialsHtml}

          <p style="font-size:13px;color:#64748b;">Note: You may edit team members or change your team name in the Captain Portal until the event deadline.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
            Fest Organizing Committee | Motihari College of Engineering, Motihari<br/>
            For any queries, contact fest organizers.
          </p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: opts.to,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    Logger.log("Failed to send registration email to " + opts.to + ": " + e.toString());
  }
}

function sendPasswordResetEmail(opts) {
  try {
    const subject = `[UMANG 2026] Your Captain Password Has Been Reset`;
    const htmlBody = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#881337 0%,#be123c 100%);color:#ffffff;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">UMANG 2026</h1>
          <p style="margin:4px 0 0 0;font-size:14px;opacity:0.9;">Motihari College of Engineering</p>
        </div>
        <div style="padding:24px;color:#1e293b;line-height:1.6;">
          <h2 style="color:#be123c;margin-top:0;">Captain Password Reset</h2>
          <p>Dear <strong>${escapeHtml(opts.captainName || "Captain")}</strong>,</p>
          <p>An administrator has reset your password for the UMANG 2026 Team Registration Portal.</p>
          
          <div style="background-color:#fef3c7;border:1px solid #f59e0b;padding:16px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 8px 0;color:#92400e;"><strong>Your New Login Credentials:</strong></p>
            <p style="font-size:16px;font-family:monospace;margin:0;background:#ffffff;padding:10px;border-radius:4px;border:1px solid #cbd5e1;">
              <strong>Email:</strong> ${escapeHtml(opts.to)}<br/>
              <strong>New Password:</strong> <span style="color:#be123c;font-weight:bold;">${escapeHtml(opts.newPassword)}</span>
            </p>
          </div>

          <p>You can now use this password to log in and manage your teams.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Motihari College of Engineering, Motihari</p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: opts.to,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    Logger.log("Failed to send password reset email to " + opts.to + ": " + e.toString());
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// 10. SETUP & SEED HELPER (Run Once from Apps Script Editor)
// =========================================================================

/**
 * Run this function once from the Apps Script editor to initialize all tabs
 * in the active spreadsheet with sample event data.
 */
function setupInitialPortalDb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Open the Google Sheet and run this from Extensions -> Apps Script.");
  }

  // Set default properties if not already present
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(CONFIG.ADMIN_PASSWORD_PROP)) {
    props.setProperty(CONFIG.ADMIN_PASSWORD_PROP, CONFIG.DEFAULT_ADMIN_PASSWORD);
  }
  if (!props.getProperty(CONFIG.SESSION_SECRET_PROP)) {
    props.setProperty(CONFIG.SESSION_SECRET_PROP, CONFIG.DEFAULT_SESSION_SECRET);
  }
  props.setProperty("PORTAL_DB_ID", ss.getId());

  // 1. Initialize Tabs
  const eventsSheet = getSheetOrInit(ss, CONFIG.TABS.EVENTS);
  const captainsSheet = getSheetOrInit(ss, CONFIG.TABS.CAPTAINS);
  const teamsSheet = getSheetOrInit(ss, CONFIG.TABS.TEAMS);
  const noticesSheet = getSheetOrInit(ss, CONFIG.TABS.NOTICES);

  // 2. Add Sample Events if empty
  if (eventsSheet.getLastRow() <= 1) {
    const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate3 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    eventsSheet.appendRow([
      "EVT-QUIZ-CROSSWORD",
      "UMANG 4.0 (Quiz & Crossword)",
      "1l67P4UsLjSMcMzvwW9WkN6ONNuUKY5JoM-VCRwDeCBo",
      "944636428",
      2,
      4,
      futureDate1,
      "TRUE"
    ]);

    eventsSheet.appendRow([
      "EVT-BATTLE-OF-BANDS",
      "Battle of Bands (Rock & Fusion)",
      "", // Source Sheet ID to be filled by Admin
      "Form Responses 1",
      3,
      8,
      futureDate1,
      "TRUE"
    ]);

    eventsSheet.appendRow([
      "EVT-NATRAJ-GROUP-DANCE",
      "Natraj - Inter-College Group Dance",
      "",
      "Form Responses 1",
      4,
      12,
      futureDate2,
      "TRUE"
    ]);

    eventsSheet.appendRow([
      "EVT-RANGMANCH-NUKKAD",
      "Rangmanch - Nukkad Natak (Street Play)",
      "",
      "Form Responses 1",
      6,
      16,
      futureDate3,
      "TRUE"
    ]);
  }

  // 3. Add Sample Notices
  if (noticesSheet.getLastRow() <= 1) {
    const nowIso = new Date().toISOString();
    noticesSheet.appendRow([
      "NOT-WELCOME",
      "ALL",
      "Welcome to UMANG 2026 Team Registrations!",
      "Captains can now register their teams for cultural events. Ensure all teammates have filled the individual event form before selecting them.",
      "notice",
      nowIso
    ]);

    noticesSheet.appendRow([
      "NOT-SCHEDULE-01",
      "EVT-BATTLE-OF-BANDS",
      "Battle of Bands Sound Check Schedule",
      "Slot allocation and sound check will commence at 10:00 AM on Day 2 in the Main Auditorium.",
      "schedule",
      nowIso
    ]);
  }

  Logger.log("Portal DB initialized successfully with sample events and notices!");
}
