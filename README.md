# UMANG 2026 - Event Team Registration Portal
### Motihari College of Engineering (MCE Motihari)

A full-stack, mobile-first cultural fest team registration system built for **UMANG 2026** at Motihari College of Engineering. 

Captains register cultural teams, select verified teammates from the event's individual Google Form response sheet, receive their auto-generated login credentials by Gmail, and manage their teams until the event deadline. An admin panel allows the fest organizing committee to configure events, reset captain passwords, review all teams, and publish bulletins.

---

## Architecture & Technology Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend & Database:** Google Apps Script Web App (`doPost`/`doGet` JSON API) acting on Google Sheets.
- **Email Delivery:** Google Apps Script `MailApp` / Gmail service.
- **Hosting & Deployment:** Frontend on Vercel, Backend on Google Apps Script (No sheet is public; all access is gated through the Apps Script API).
- **Security:**
  - Password hashing via SHA-256 with unique 16-character salt.
  - Signed HMAC-SHA256 session tokens with 24-hour expiry.
  - Concurrency locking using `LockService` on all sheet writes.
  - Dynamic in-memory caching of source sheet registrations via `CacheService` (2-minute TTL).
  - Rate limiting on captain login (5 failed attempts locks login for 10 minutes).
  - Data masking of student emails (`p***@gmail.com`) for browser safety.

---

## 1. Google Sheets Setup ("Portal DB")

Create a new Google Spreadsheet named **`Portal DB - UMANG 2026`** with the following 4 tabs:

### Tab 1: `Events`
| Column Header | Type | Description | Sample Value |
|---|---|---|---|
| `event_id` | Text | Unique identifier | `EVT-BATTLE-OF-BANDS` |
| `event_name` | Text | Name of the event | `Battle of Bands (Rock & Fusion)` |
| `source_sheet_id` | Text | ID of this event's Google Form sheet | `1A2B3C4D5E6F7G8H9I0J...` |
| `source_tab_name` | Text | Sheet tab name | `Form Responses 1` |
| `min_team_size` | Number | Minimum allowed squad size | `3` |
| `max_team_size` | Number | Maximum allowed squad size | `8` |
| `deadline` | ISO Date | Registration deadline | `2026-12-05T23:59:59.000Z` |
| `is_open` | Boolean | Open/Closed toggle | `TRUE` |

### Tab 2: `Captains`
| Column Header | Type | Description |
|---|---|---|
| `captain_email` | Text (Primary Key) | Captain's verified email address |
| `captain_name` | Text | Captain's name from form |
| `password_hash` | Text | SHA-256(salt + password) |
| `salt` | Text | Unique 16-character salt |
| `created_at` | ISO Date | Timestamp of registration |

### Tab 3: `Teams`
| Column Header | Type | Description |
|---|---|---|
| `team_id` | Text | Unique ID, e.g. `TEAM-XXXX` |
| `event_id` | Text | Foreign key to `Events.event_id` |
| `team_name` | Text | Unique team name within event |
| `captain_email` | Text | Foreign key to `Captains.captain_email` |
| `members_json` | JSON String | Array of member objects: `[{"name":"...","roll":"...","branch":"...","is_captain":true}, ...]` |
| `status` | Text | `Registered` |
| `created_at` | ISO Date | Creation timestamp |
| `updated_at` | ISO Date | Last update timestamp |

### Tab 4: `Notices`
| Column Header | Type | Description |
|---|---|---|
| `notice_id` | Text | `NOT-XXXX` |
| `event_id` | Text | Event ID or `ALL` |
| `title` | Text | Announcement headline |
| `body` | Text | Bulletin text |
| `type` | Text | `notice` \| `schedule` \| `result` |
| `created_at` | ISO Date | Timestamp |

> Sample CSVs are available in `backend/sample_data/` for immediate import.

---

## 2. Event Source Sheets (Google Form Responses)

Each event has its own Google Form where participants register individually.
The form response sheet must include columns for:
- **Name** (e.g. `Name`, `Student Name`, `Candidate Name`)
- **Roll No** (e.g. `Roll No`, `Roll Number`, `University Roll No`)
- **Email** (e.g. `Email Address`, `Email`, `Gmail`)
- **Branch** (e.g. `Branch`, `Department`, `Stream`)

> **Configurable Aliases:** Column header text is dynamically recognized via `CONFIG.SOURCE_COLUMNS` in `backend/Code.gs`. Different Google Form question wording is automatically mapped.

---

## 3. Deploying Google Apps Script Web App

1. Open your **Portal DB** Google Sheet.
2. Go to **Extensions** → **Apps Script**.
3. Replace any code in the editor with the entire contents of [backend/Code.gs](file:///d:/Umang/backend/Code.gs).
4. Run the one-time initializer:
   - In the toolbar function dropdown, select `setupInitialPortalDb` and click **Run**.
   - Grant the necessary Google Workspace permissions (Spreadsheets and MailApp).
   - This creates all 4 tabs with formatted headers, seeds sample events, and registers default properties.
5. Set **Script Properties**:
   - In the Apps Script left sidebar, click **Project Settings** (gear icon ⚙️).
   - Scroll to **Script Properties** and click **Edit script properties**:
     - `ADMIN_PASSWORD`: Your secret admin password (e.g. `Admin@Umang2026#MCE`).
     - `SESSION_SECRET`: A long random secret string for HMAC session signatures.
     - `PORTAL_DB_ID`: (Optional if container-bound; required if standalone script). The ID of the Portal DB spreadsheet.
   - Click **Save script properties**.
6. Deploy as Web App:
   - Click **Deploy** (top right) → **New deployment**.
   - Select type: **Web app** (click the gear icon).
   - Set **Description**: `UMANG 2026 API v1`.
   - Set **Execute as**: `Me (your Google account)`.
   - Set **Who has access**: `Anyone`. *(Crucial: allows the frontend to call the API without Google login gates).*
   - Click **Deploy**.
   - Copy the **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 4. Frontend Setup & Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Paste your Apps Script Web App URL:
   ```env
   NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
   *(Note: If `NEXT_PUBLIC_API_URL` is omitted or empty, the app runs in **Demo Preview Mode** with sample students, events, and mock actions for immediate inspection).*

3. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Deploying Frontend to Vercel

### Option A: Via Vercel CLI
```bash
npx vercel
```
When prompted for Environment Variables, add:
- `NEXT_PUBLIC_API_URL`: Your deployed Apps Script Web App URL.

### Option B: Via Vercel Dashboard
1. Push your repository to GitHub.
2. In the Vercel Dashboard, click **Add New** → **Project** → Import your repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://script.google.com/macros/s/.../exec`
4. Click **Deploy**.

---

## 6. Testing & Verifying All Flows

### Flow 1: Public Team Registration (`/register`)
1. Select an open cultural event (e.g. *Battle of Bands*).
2. Enter a captain Roll No (e.g. `21105128001`). Click **Verify Captain**.
3. If the student has not filled the event form, the system alerts:
   `"You are not registered for this event. Fill the individual form first."`
4. Enter team name (e.g. *The Champaran Grooves*).
5. Search teammates by typing Roll No or Name. Click `+ Add` to add members.
6. The squad size counter tracks min/max boundaries.
7. Click **Complete Team Registration**.
8. Confetti fires, showing team summary and confirmation that credentials have been emailed to the captain's Gmail.

### Flow 2: Captain Login & Team Edits (`/login` & `/dashboard`)
1. Captain enters email and generated password.
2. Rate-limiting safeguards against brute force (5 attempts = 10 min lock).
3. On `/dashboard`, view registered teams with status, event info, and members.
4. Click **Edit Team** to rename or adjust teammates before the deadline.
5. If the deadline has passed, the team is automatically marked **Locked**.
6. Check **Notices & Schedules** tab for real-time announcements.

### Flow 3: Admin Panel (`/admin`)
1. Log in with the master admin password (`Admin@Umang2026#MCE`).
2. **Manage Events:** Add or edit events, configure Google Form source sheet IDs, adjust team sizes and deadlines, toggle `is_open`.
3. **Teams Roster:** Search teams across events, view full member rosters.
4. **Reset Captain Password:** Enter captain email; backend generates a new 8-char password, updates hash, and sends an email via `MailApp`.
5. **Post Bulletins:** Publish notices, sound check schedules, or results to ALL or specific events.

---

## License & Credits
- **Client:** Motihari College of Engineering (MCE Motihari), Bihar.
- **Event:** UMANG 2026 Annual Cultural Fest.
