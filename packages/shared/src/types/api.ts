import type { GeoPoint } from '../geo.js';
import type {
  IncidentCategory,
  IncidentStatus,
  MemberStatus,
  CommunityRole,
  ResponderStatus,
  DevicePlatform,
} from '../constants.js';

export type { DevicePlatform };

export interface DeviceInfo {
  id: string;
  fcmToken: string;
  platform: DevicePlatform;
}

// --- User ---
export interface UserProfile {
  id: string;
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// --- Community ---
export interface Community {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  location: GeoPoint;
  radiusM: number;
  memberCount?: number;
  createdAt: string;
}

export interface CommunityMember {
  userId: string;
  displayName: string;
  role: CommunityRole;
  status: MemberStatus;
  joinedAt: string;
}

// --- Incident ---
export interface Incident {
  id: string;
  communityId: string;
  reporterId: string;
  reporterName: string;
  category: IncidentCategory;
  status: IncidentStatus;
  location: GeoPoint;
  radiusM: number;
  isDrill: boolean;
  description: string | null;
  responderCount: number;
  acceptedCount: number;
  createdAt: string;
  resolvedAt: string | null;
}

export interface IncidentResponder {
  userId: string;
  displayName: string;
  status: ResponderStatus;
  location: GeoPoint | null;
  distanceMeters: number | null;
  etaMinutes: number | null;
  acceptedAt: string | null;
}

// --- Availability ---
export interface AvailabilityStatus {
  communityId: string;
  isAvailable: boolean;
  location: GeoPoint | null;
  updatedAt: string;
}

// --- Emergency Contact ---
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

// --- Socket Events ---
export interface SocketEvents {
  // Server -> Client
  'incident:created': { incident: Incident };
  'responder:accepted': { incidentId: string; responder: IncidentResponder };
  'responder:location': { incidentId: string; userId: string; location: GeoPoint };
  'responder:arrived': { incidentId: string; userId: string };
  'incident:resolved': { incidentId: string };
  'incident:cancelled': { incidentId: string };
  'incident:radius-expanded': { incidentId: string; newRadiusM: number };

  // Client -> Server
  'join:incident': { incidentId: string };
  'leave:incident': { incidentId: string };
  'location:update': { incidentId: string; location: GeoPoint };
}

// --- API Response wrapper ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
