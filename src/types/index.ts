export interface EventItem {
  event_id: string;
  event_name: string;
  source_sheet_id?: string;
  source_tab_name?: string;
  min_team_size: number;
  max_team_size: number;
  deadline: string; // ISO string
  is_open: boolean;
  sub_categories?: string[] | string;
}

export interface Student {
  name: string;
  roll: string;
  branch: string;
  email_masked?: string;
  is_captain?: boolean;
  participation?: string;
  already_registered?: boolean;
  registered_team?: string;
}

export interface TeamMember {
  name: string;
  roll: string;
  branch: string;
  is_captain: boolean;
  participation?: string;
}

export interface Team {
  team_id: string;
  event_id: string;
  event_name?: string;
  team_name: string;
  captain_email: string;
  members: TeamMember[];
  members_count?: number;
  status: string;
  deadline?: string;
  is_locked?: boolean;
  min_team_size?: number;
  max_team_size?: number;
  created_at?: string;
  updated_at?: string;
  sub_category?: string;
}

export interface Notice {
  notice_id: string;
  event_id: string;
  title: string;
  body: string;
  type: "notice" | "schedule" | "result" | string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface CaptainSession {
  token: string;
  captain_name: string;
  captain_email: string;
}

export interface AdminSession {
  token: string;
  role: "admin";
}
