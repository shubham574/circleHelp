import { describe, it, expect } from 'vitest';
import {
  createIncidentSchema,
  createCommunitySchema,
  updateAvailabilitySchema,
  registerSchema,
  createContactSchema,
  createReportSchema,
} from '../schemas/index.js';

describe('Zod Schemas validation', () => {
  it('validates valid incident creation payload', () => {
    const valid = {
      communityId: '123e4567-e89b-12d3-a456-426614174000',
      category: 'medical',
      location: { lat: 28.6129, lng: 77.2295 },
      description: 'Need first aid immediately',
      isDrill: false,
    };
    const result = createIncidentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid category in incident creation', () => {
    const invalid = {
      communityId: '123e4567-e89b-12d3-a456-426614174000',
      category: 'alien_attack',
      location: { lat: 28.6129, lng: 77.2295 },
    };
    const result = createIncidentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid coordinate bounds in community creation', () => {
    const invalid = {
      name: 'Test Society',
      location: { lat: 95.0, lng: 77.2295 },
      radiusM: 2000,
    };
    const result = createCommunitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('enforces E.164 phone format for emergency contacts', () => {
    const validContact = {
      name: 'Jane Doe',
      phone: '+919876543210',
      relationship: 'Sister',
    };
    expect(createContactSchema.safeParse(validContact).success).toBe(true);

    const invalidPhone = {
      name: 'Jane Doe',
      phone: '9876543210', // Missing +
    };
    expect(createContactSchema.safeParse(invalidPhone).success).toBe(false);
  });

  it('validates availability toggle payloads', () => {
    const availOn = {
      communityId: '123e4567-e89b-12d3-a456-426614174000',
      isAvailable: true,
      location: { lat: 28.61, lng: 77.22 },
    };
    expect(updateAvailabilitySchema.safeParse(availOn).success).toBe(true);

    const availOff = {
      communityId: '123e4567-e89b-12d3-a456-426614174000',
      isAvailable: false,
    };
    expect(updateAvailabilitySchema.safeParse(availOff).success).toBe(true);
  });

  it('validates report creation with valid reasons', () => {
    const validReport = {
      reportedUserId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'harassment',
      description: 'User exhibited threatening behavior during response.',
    };
    expect(createReportSchema.safeParse(validReport).success).toBe(true);
  });
});
