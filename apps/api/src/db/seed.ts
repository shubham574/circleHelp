import pg from 'pg';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

export async function seedDatabase() {
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 1 });
  const db = drizzle(pool, { schema });

  // Ensure PostGIS extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  console.log('🌱 Seeding database...');

  // 1. Create Users
  const [admin] = await db
    .insert(schema.users)
    .values({
      firebaseUid: 'seed_firebase_admin_001',
      displayName: 'Alice Admin',
      phone: '+919876543210',
    })
    .onConflictDoNothing()
    .returning();

  const [victim] = await db
    .insert(schema.users)
    .values({
      firebaseUid: 'seed_firebase_victim_002',
      displayName: 'Bob Victim',
      phone: '+919876543211',
    })
    .onConflictDoNothing()
    .returning();

  const responderData = [
    {
      firebaseUid: 'seed_firebase_charlie_003',
      displayName: 'Charlie Volunteer',
      phone: '+919876543212',
      lat: 28.6150,
      lng: 77.2100, // ~200m from center
      fcmToken: 'fcm_mock_token_charlie',
    },
    {
      firebaseUid: 'seed_firebase_diana_004',
      displayName: 'Diana FirstAid',
      phone: '+919876543213',
      lat: 28.6160,
      lng: 77.2110, // ~350m from center
      fcmToken: 'fcm_mock_token_diana',
    },
    {
      firebaseUid: 'seed_firebase_evan_005',
      displayName: 'Evan Helper',
      phone: '+919876543214',
      lat: 28.6180,
      lng: 77.2130, // ~600m from center
      fcmToken: 'fcm_mock_token_evan',
    },
    {
      firebaseUid: 'seed_firebase_fiona_006',
      displayName: 'Fiona Distant',
      phone: '+919876543215',
      lat: 28.6250,
      lng: 77.2200, // ~1.6km (outside 1km, inside 2km expand radius)
      fcmToken: 'fcm_mock_token_fiona',
    },
    {
      firebaseUid: 'seed_firebase_george_007',
      displayName: 'George Offline',
      phone: '+919876543216',
      lat: null,
      lng: null,
      fcmToken: 'fcm_mock_token_george',
    },
  ];

  const adminId = admin?.id ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.firebaseUid, 'seed_firebase_admin_001') }))!.id;
  const victimId = victim?.id ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.firebaseUid, 'seed_firebase_victim_002') }))!.id;

  // 2. Create Community
  await db.execute(sql`
    INSERT INTO communities (name, description, invite_code, location, radius_m, created_by)
    VALUES (
      'Green Valley Society',
      'Verified residential society community in New Delhi',
      'GVALLEY1',
      ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)::geography,
      3000,
      ${adminId}
    )
    ON CONFLICT (invite_code) DO NOTHING;
  `);

  const community = await db.query.communities.findFirst({
    where: (c, { eq }) => eq(c.inviteCode, 'GVALLEY1'),
  });
  if (!community) throw new Error('Failed to find seeded community');

  // 3. Add Community Memberships
  await db
    .insert(schema.communityMembers)
    .values([
      { userId: adminId, communityId: community.id, role: 'admin', status: 'approved' },
      { userId: victimId, communityId: community.id, role: 'member', status: 'approved' },
    ])
    .onConflictDoNothing();

  // 4. Add Emergency Contacts for Victim
  await db
    .insert(schema.emergencyContacts)
    .values([
      { userId: victimId, name: 'Sarah Sister', phone: '+919999888877', relationship: 'Sister' },
      { userId: victimId, name: 'David Brother', phone: '+919999888878', relationship: 'Brother' },
    ])
    .onConflictDoNothing();

  // 5. Seed Responders, Devices, and Availability
  for (const resp of responderData) {
    let user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.firebaseUid, resp.firebaseUid),
    });

    if (!user) {
      const [created] = await db
        .insert(schema.users)
        .values({
          firebaseUid: resp.firebaseUid,
          displayName: resp.displayName,
          phone: resp.phone,
        })
        .returning();
      user = created;
    }

    if (!user) continue;

    // Membership
    await db
      .insert(schema.communityMembers)
      .values({
        userId: user.id,
        communityId: community.id,
        role: 'member',
        status: 'approved',
      })
      .onConflictDoNothing();

    // Device
    await db
      .insert(schema.devices)
      .values({
        userId: user.id,
        fcmToken: resp.fcmToken,
        platform: 'android',
      })
      .onConflictDoNothing();

    // Availability
    if (resp.lat !== null && resp.lng !== null) {
      await db.execute(sql`
        INSERT INTO availability (user_id, community_id, is_available, location, updated_at)
        VALUES (
          ${user.id},
          ${community.id},
          true,
          ST_SetSRID(ST_MakePoint(${resp.lng}, ${resp.lat}), 4326)::geography,
          NOW()
        )
        ON CONFLICT (user_id, community_id)
        DO UPDATE SET
          is_available = true,
          location = ST_SetSRID(ST_MakePoint(${resp.lng}, ${resp.lat}), 4326)::geography,
          updated_at = NOW();
      `);
    } else {
      await db.execute(sql`
        INSERT INTO availability (user_id, community_id, is_available, location, updated_at)
        VALUES (${user.id}, ${community.id}, false, NULL, NOW())
        ON CONFLICT (user_id, community_id) DO NOTHING;
      `);
    }
  }

  console.log('✅ Database seeded successfully with:');
  console.log(`   - Community: ${community.name} (Code: ${community.inviteCode})`);
  console.log('   - 1 Admin user (Alice)');
  console.log('   - 1 Victim user (Bob)');
  console.log('   - 4 Active responders with GPS coords');
  console.log('   - 1 Offline user');

  await pool.end();
}

if (process.env.NODE_ENV !== 'test') {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
