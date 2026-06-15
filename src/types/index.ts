export type Couple = {
  id: string;
  name: string | null;
  created_by: string | null;
  created_at: string;
};

export type InviteCode = {
  id: string;
  couple_id: string;
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  partner_order: number;
  couple_id: string | null;
  created_at: string;
};

export type DailyVerse = {
  id: string;
  couple_id: string;
  verse_date: string;
  responsible_user_id: string;
  bible_reference: string;
  verse_text: string;
  main_reflection: string;
  prayer_note: string | null;
  submitted_by: string;
  submitted_at: string;
  submitted_by_profile?: Profile;
};

export type Reflection = {
  id: string;
  verse_id: string;
  user_id: string;
  reflection_text: string;
  read_status: boolean;
  prayed_status: boolean;
  reaction: string | null;
  created_at: string;
  profile?: Profile;
};

export type PrayerRequest = {
  id: string;
  couple_id: string;
  user_id: string;
  request_text: string;
  is_answered: boolean;
  created_at: string;
  answered_at: string | null;
  profile?: Profile;
};

export type ThoughtTestimony = {
  id: string;
  couple_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
};

export type WeeklyGoal = {
  id: string;
  couple_id: string;
  week_start: string;
  goal_text: string;
  completed: boolean;
  created_by: string;
  created_at: string;
  profile?: Profile;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
};
