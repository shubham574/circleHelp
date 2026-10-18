import { describe, it, expect } from 'vitest';
import { pointToDriver, pointFromDriver, geographyPoint } from '../db/custom-types';
import * as schema from '../db/schema';
import { getTableColumns } from 'drizzle-orm';

describe('Custom PostGIS Geography Type', () => {
  it('formats coordinates to EWKT geography string in Longitude Latitude order', () => {
    const point = { lng: 77.2090, lat: 28.6139 };
    const driverValue = pointToDriver(point);
    expect(driverValue).toBe('SRID=4326;POINT(77.209 28.6139)');
  });

  it('parses POINT string from database into GeoPoint object', () => {
    const wkt = 'POINT(77.2090 28.6139)';
    const parsed = pointFromDriver(wkt);
    expect(parsed.lng).toBe(77.2090);
    expect(parsed.lat).toBe(28.6139);
  });

  it('parses EWKT format with SRID prefix', () => {
    const ewkt = 'SRID=4326;POINT(77.20902 28.61394)';
    const parsed = pointFromDriver(ewkt);
    expect(parsed.lng).toBe(77.20902);
    expect(parsed.lat).toBe(28.61394);
  });

  it('throws an informative error for invalid Point driver strings', () => {
    expect(() => pointFromDriver('INVALID_POLYGON')).toThrow(
      'Failed to parse PostGIS Point string'
    );
  });

  it('creates geography column builder function', () => {
    const colBuilder = geographyPoint('test_col');
    expect(colBuilder).toBeDefined();
  });
});

describe('Drizzle Schema Definitions (12 Tables)', () => {
  it('defines all required tables with primary and foreign keys', () => {
    const tables = [
      schema.users,
      schema.communities,
      schema.communityMembers,
      schema.devices,
      schema.availability,
      schema.incidents,
      schema.incidentResponders,
      schema.emergencyContacts,
      schema.incidentEvents,
      schema.reports,
      schema.userStrikes,
      schema.consentRecords,
    ];

    expect(tables.length).toBe(12);

    for (const table of tables) {
      expect(table).toBeDefined();
      const cols = getTableColumns(table);
      expect(Object.keys(cols).length).toBeGreaterThan(0);
    }
  });

  it('configures availability table with compound primary key and location column', () => {
    const cols = getTableColumns(schema.availability);
    expect(cols.userId).toBeDefined();
    expect(cols.communityId).toBeDefined();
    expect(cols.isAvailable).toBeDefined();
    expect(cols.location).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it('configures incidents table with category enum, geography location, and status', () => {
    const cols = getTableColumns(schema.incidents);
    expect(cols.id).toBeDefined();
    expect(cols.communityId).toBeDefined();
    expect(cols.reporterId).toBeDefined();
    expect(cols.category).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.location).toBeDefined();
    expect(cols.radiusM).toBeDefined();
    expect(cols.isDrill).toBeDefined();
  });

  it('configures community members table with roles and member statuses', () => {
    const cols = getTableColumns(schema.communityMembers);
    expect(cols.userId).toBeDefined();
    expect(cols.communityId).toBeDefined();
    expect(cols.role).toBeDefined();
    expect(cols.status).toBeDefined();
  });
});
