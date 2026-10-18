CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint
CREATE TYPE "public"."community_role" AS ENUM('admin', 'coordinator', 'member');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TYPE "public"."incident_category" AS ENUM('medical', 'accident', 'fire', 'womens_safety', 'missing_person', 'blood_needed', 'other');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('active', 'resolved', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'approved', 'banned');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('harassment', 'false_alarm', 'no_show', 'inappropriate_behavior', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'investigating', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."responder_status" AS ENUM('notified', 'accepted', 'declined', 'arrived', 'cancelled');--> statement-breakpoint
CREATE TABLE "availability" (
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"location" geography(Point, 4326),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_user_id_community_id_pk" PRIMARY KEY("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"invite_code" varchar(32),
	"location" geography(Point, 4326) NOT NULL,
	"radius_m" integer DEFAULT 5000 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communities_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "chk_communities_radius_positive" CHECK ("communities"."radius_m" > 0 AND "communities"."radius_m" <= 100000)
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"role" "community_role" DEFAULT 'member' NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_members_user_id_community_id_pk" PRIMARY KEY("user_id","community_id")
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"terms_version" varchar(20) NOT NULL,
	"privacy_version" varchar(20) NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fcm_token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_fcm_token_unique" UNIQUE("fcm_token")
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"relationship" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"actor_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_responders" (
	"incident_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "responder_status" DEFAULT 'notified' NOT NULL,
	"location" geography(Point, 4326),
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_responders_incident_id_user_id_pk" PRIMARY KEY("incident_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"reporter_id" uuid,
	"category" "incident_category" NOT NULL,
	"status" "incident_status" DEFAULT 'active' NOT NULL,
	"location" geography(Point, 4326),
	"radius_m" integer DEFAULT 1000 NOT NULL,
	"is_drill" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_user_id" uuid NOT NULL,
	"incident_id" uuid,
	"reason" "report_reason" NOT NULL,
	"description" text NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_strikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"issued_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_events" ADD CONSTRAINT "incident_events_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_events" ADD CONSTRAINT "incident_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_responders" ADD CONSTRAINT "incident_responders_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_responders" ADD CONSTRAINT "incident_responders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_availability_location_active" ON "availability" USING gist ("location") WHERE "availability"."is_available" = true AND "availability"."location" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_availability_comm_active_updated" ON "availability" USING btree ("community_id","is_available","updated_at");--> statement-breakpoint
CREATE INDEX "idx_communities_location" ON "communities" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_communities_invite_code" ON "communities" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "idx_communities_created_by" ON "communities" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_comm_members_comm_status" ON "community_members" USING btree ("community_id","status");--> statement-breakpoint
CREATE INDEX "idx_comm_members_user_status" ON "community_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_consent_records_user_version" ON "consent_records" USING btree ("user_id","terms_version","privacy_version");--> statement-breakpoint
CREATE INDEX "idx_consent_records_consented_at" ON "consent_records" USING btree ("consented_at");--> statement-breakpoint
CREATE INDEX "idx_devices_user_id" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_devices_fcm_token" ON "devices" USING btree ("fcm_token");--> statement-breakpoint
CREATE INDEX "idx_emergency_contacts_user_id" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_incident_events_incident_time" ON "incident_events" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_incident_events_actor" ON "incident_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_inc_resp_incident_status" ON "incident_responders" USING btree ("incident_id","status");--> statement-breakpoint
CREATE INDEX "idx_inc_resp_user_id" ON "incident_responders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_inc_resp_location" ON "incident_responders" USING gist ("location") WHERE "incident_responders"."location" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_incidents_location" ON "incidents" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_incidents_active_location" ON "incidents" USING gist ("location") WHERE "incidents"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_incidents_community_status_created" ON "incidents" USING btree ("community_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_incidents_reporter" ON "incidents" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_reports_reported_user" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "idx_reports_reporter" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_reports_status_created" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_reports_incident" ON "reports" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_user_strikes_user_id" ON "user_strikes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_strikes_created_at" ON "user_strikes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_firebase_uid" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_phone" ON "users" USING btree ("phone");

