export const INCIDENT_CATEGORIES = [
  'medical',
  'accident',
  'fire',
  'womens_safety',
  'missing_person',
  'blood_needed',
  'other',
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  medical: 'Medical Emergency',
  accident: 'Accident',
  fire: 'Fire',
  womens_safety: "Women's Safety",
  missing_person: 'Missing Child / Elderly',
  blood_needed: 'Blood Needed',
  other: 'Other',
};

export const INCIDENT_STATUSES = ['active', 'resolved', 'cancelled', 'expired'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const MEMBER_STATUSES = ['pending', 'approved', 'banned'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const COMMUNITY_ROLES = ['admin', 'coordinator', 'member'] as const;
export type CommunityRole = (typeof COMMUNITY_ROLES)[number];

export const RESPONDER_STATUSES = ['notified', 'accepted', 'declined', 'arrived', 'cancelled'] as const;
export type ResponderStatus = (typeof RESPONDER_STATUSES)[number];

export const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const REPORT_REASONS = [
  'harassment',
  'false_alarm',
  'no_show',
  'inappropriate_behavior',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['pending', 'investigating', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Default configuration values
export const DEFAULTS = {
  SOS_CANCEL_WINDOW_SECONDS: 5,
  SOS_DEFAULT_RADIUS_METERS: 1000,
  SOS_EXPAND_RADIUS_METERS: 2000,
  SOS_EXPAND_DELAY_SECONDS: 90,
  SOS_RATE_LIMIT_PER_HOUR: 3,
  LOCATION_STALENESS_MINUTES: 5,
  AVAILABILITY_PURGE_MINUTES: 30,
  INCIDENT_LOCATION_RETENTION_DAYS: 30,
  API_RATE_LIMIT_PER_MINUTE: 100,
  MAX_EMERGENCY_CONTACTS: 5,
  TRACKING_TOKEN_EXPIRY_HOURS: 24,
  AUTO_BAN_STRIKE_THRESHOLD: 3,
} as const;

export const SAFETY_DISCLAIMER = 'Do not confront danger. Call the police (112) first. You are not obligated to respond — only help if you feel safe.';

export const DRILL_BANNER_TEXT = '⚠️ DRILL — This is not a real emergency';
