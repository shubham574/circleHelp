import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { geographyPoint } from './custom-types.js';

// ========================================================
// ENUMS
// ========================================================

export const communityRoleEnum = pgEnum('community_role', ['admin', 'coordinator', 'member']);
export const memberStatusEnum = pgEnum('member_status', ['pending', 'approved', 'banned']);
export const devicePlatformEnum = pgEnum('device_platform', ['ios', 'android', 'web']);
export const incidentCategoryEnum = pgEnum('incident_category', [
  'medical',
  'accident',
  'fire',
  'womens_safety',
  'missing_person',
  'blood_needed',
  'other',
]);
export const incidentStatusEnum = pgEnum('incident_status', [
  'active',
  'resolved',
  'cancelled',
  'expired',
]);
export const responderStatusEnum = pgEnum('responder_status', [
  'notified',
  'accepted',
  'declined',
  'arrived',
  'cancelled',
]);
export const reportReasonEnum = pgEnum('report_reason', [
  'harassment',
  'false_alarm',
  'no_show',
  'inappropriate_behavior',
  'spam',
  'other',
]);
export const reportStatusEnum = pgEnum('report_status', [
  'pending',
  'investigating',
  'resolved',
  'dismissed',
]);

// ========================================================
// 1. USERS
// ========================================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).unique(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_users_firebase_uid').on(table.firebaseUid),
  uniqueIndex('idx_users_phone').on(table.phone),
]);

// ========================================================
// 2. COMMUNITIES
// ========================================================
export const communities = pgTable('communities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  inviteCode: varchar('invite_code', { length: 32 }).unique(),
  location: geographyPoint('location').notNull(),
  radiusM: integer('radius_m').notNull().default(5000),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_communities_location').using('gist', table.location),
  uniqueIndex('idx_communities_invite_code').on(table.inviteCode),
  index('idx_communities_created_by').on(table.createdBy),
  check('chk_communities_radius_positive', sql`${table.radiusM} > 0 AND ${table.radiusM} <= 100000`),
]);

// ========================================================
// 3. COMMUNITY_MEMBERS
// ========================================================
export const communityMembers = pgTable('community_members', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  role: communityRoleEnum('role').default('member').notNull(),
  status: memberStatusEnum('status').default('pending').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.communityId] }),
  index('idx_comm_members_comm_status').on(table.communityId, table.status),
  index('idx_comm_members_user_status').on(table.userId, table.status),
]);

// ========================================================
// 4. DEVICES
// ========================================================
export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fcmToken: text('fcm_token').notNull().unique(),
  platform: devicePlatformEnum('platform').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_devices_user_id').on(table.userId),
  uniqueIndex('idx_devices_fcm_token').on(table.fcmToken),
]);

// ========================================================
// 5. AVAILABILITY
// ========================================================
export const availability = pgTable('availability', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  isAvailable: boolean('is_available').default(false).notNull(),
  location: geographyPoint('location'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.communityId] }),
  // Partial GiST index for fast spatial lookups of available users only
  index('idx_availability_location_active')
    .using('gist', table.location)
    .where(sql`${table.isAvailable} = true AND ${table.location} IS NOT NULL`),
  index('idx_availability_comm_active_updated').on(
    table.communityId,
    table.isAvailable,
    table.updatedAt
  ),
]);

// ========================================================
// 6. INCIDENTS
// ========================================================
export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  category: incidentCategoryEnum('category').notNull(),
  status: incidentStatusEnum('status').default('active').notNull(),
  location: geographyPoint('location'),
  radiusM: integer('radius_m').default(1000).notNull(),
  isDrill: boolean('is_drill').default(false).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, (table) => [
  index('idx_incidents_location').using('gist', table.location),
  // Partial GiST index for active incidents
  index('idx_incidents_active_location')
    .using('gist', table.location)
    .where(sql`${table.status} = 'active'`),
  index('idx_incidents_community_status_created').on(
    table.communityId,
    table.status,
    table.createdAt
  ),
  index('idx_incidents_reporter').on(table.reporterId),
]);

// ========================================================
// 7. INCIDENT_RESPONDERS
// ========================================================
export const incidentResponders = pgTable('incident_responders', {
  incidentId: uuid('incident_id').references(() => incidents.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: responderStatusEnum('status').default('notified').notNull(),
  location: geographyPoint('location'),
  notifiedAt: timestamp('notified_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.incidentId, table.userId] }),
  index('idx_inc_resp_incident_status').on(table.incidentId, table.status),
  index('idx_inc_resp_user_id').on(table.userId),
  index('idx_inc_resp_location').using('gist', table.location).where(sql`${table.location} IS NOT NULL`),
]);

// ========================================================
// 8. EMERGENCY_CONTACTS
// ========================================================
export const emergencyContacts = pgTable('emergency_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  relationship: varchar('relationship', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_emergency_contacts_user_id').on(table.userId),
]);

// ========================================================
// 9. INCIDENT_EVENTS (Immutable Audit Trail)
// ========================================================
export const incidentEvents = pgTable('incident_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id').references(() => incidents.id, { onDelete: 'cascade' }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_incident_events_incident_time').on(table.incidentId, table.createdAt),
  index('idx_incident_events_actor').on(table.actorId),
]);

// ========================================================
// 10. REPORTS
// ========================================================
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  reportedUserId: uuid('reported_user_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  incidentId: uuid('incident_id').references(() => incidents.id, { onDelete: 'set null' }),
  reason: reportReasonEnum('reason').notNull(),
  description: text('description').notNull(),
  status: reportStatusEnum('status').default('pending').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (table) => [
  index('idx_reports_reported_user').on(table.reportedUserId),
  index('idx_reports_reporter').on(table.reporterId),
  index('idx_reports_status_created').on(table.status, table.createdAt),
  index('idx_reports_incident').on(table.incidentId),
]);

// ========================================================
// 11. USER_STRIKES
// ========================================================
export const userStrikes = pgTable('user_strikes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reason: text('reason').notNull(),
  issuedBy: uuid('issued_by').references(() => users.id, { onDelete: 'set null' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_user_strikes_user_id').on(table.userId),
  index('idx_user_strikes_created_at').on(table.createdAt),
]);

// ========================================================
// 12. CONSENT_RECORDS
// ========================================================
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  termsVersion: varchar('terms_version', { length: 20 }).notNull(),
  privacyVersion: varchar('privacy_version', { length: 20 }).notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
}, (table) => [
  index('idx_consent_records_user_version').on(
    table.userId,
    table.termsVersion,
    table.privacyVersion
  ),
  index('idx_consent_records_consented_at').on(table.consentedAt),
]);

// ========================================================
// DRIZZLE RELATIONS
// ========================================================

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(communityMembers),
  devices: many(devices),
  availabilities: many(availability),
  reportedIncidents: many(incidents),
  responses: many(incidentResponders),
  emergencyContacts: many(emergencyContacts),
  strikes: many(userStrikes),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, {
    fields: [communities.createdBy],
    references: [users.id],
  }),
  members: many(communityMembers),
  incidents: many(incidents),
  availabilities: many(availability),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  community: one(communities, {
    fields: [incidents.communityId],
    references: [communities.id],
  }),
  reporter: one(users, {
    fields: [incidents.reporterId],
    references: [users.id],
  }),
  responders: many(incidentResponders),
  events: many(incidentEvents),
}));

export const incidentRespondersRelations = relations(incidentResponders, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentResponders.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentResponders.userId],
    references: [users.id],
  }),
}));
