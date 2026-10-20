import type { FastifyPluginAsync } from 'fastify';
import {
  createContactSchema,
  updateContactSchema,
  DEFAULTS,
} from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { emergencyContacts } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export const contactRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * GET /contacts
   * Fetch user's registered emergency contacts.
   */
  app.get('/', async (request, reply) => {
    const currentUser = request.user!;

    const list = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, currentUser.id))
      .orderBy(emergencyContacts.createdAt);

    return reply.send({
      success: true,
      data: {
        contacts: list,
        maxContacts: DEFAULTS.MAX_EMERGENCY_CONTACTS,
      },
    });
  });

  /**
   * POST /contacts
   * Add a new emergency contact (up to MAX_EMERGENCY_CONTACTS, default 5).
   */
  app.post('/', async (request, reply) => {
    const currentUser = request.user!;

    const parseResult = createContactSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid contact details',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    // Check count limit
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, currentUser.id));

    if (countResult && countResult.count >= DEFAULTS.MAX_EMERGENCY_CONTACTS) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MAX_CONTACTS_REACHED',
          message: `You can only add up to ${DEFAULTS.MAX_EMERGENCY_CONTACTS} emergency contacts`,
        },
      });
    }

    const { name, phone, relationship } = parseResult.data;

    const [created] = await db
      .insert(emergencyContacts)
      .values({
        userId: currentUser.id,
        name,
        phone,
        relationship: relationship || null,
      })
      .returning();

    return reply.status(201).send({
      success: true,
      data: {
        contact: created,
      },
    });
  });

  /**
   * PATCH /contacts/:id
   * Update emergency contact details.
   */
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const parseResult = updateContactSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid contact update details',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const updateData: Partial<typeof emergencyContacts.$inferInsert> = {};
    if (parseResult.data.name !== undefined) updateData.name = parseResult.data.name;
    if (parseResult.data.phone !== undefined) updateData.phone = parseResult.data.phone;
    if (parseResult.data.relationship !== undefined)
      updateData.relationship = parseResult.data.relationship;

    const [updated] = await db
      .update(emergencyContacts)
      .set(updateData)
      .where(
        and(
          eq(emergencyContacts.id, id),
          eq(emergencyContacts.userId, currentUser.id)
        )
      )
      .returning();

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Emergency contact not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        contact: updated,
      },
    });
  });

  /**
   * DELETE /contacts/:id
   * Remove an emergency contact.
   */
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const deleted = await db
      .delete(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.id, id),
          eq(emergencyContacts.userId, currentUser.id)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CONTACT_NOT_FOUND',
          message: 'Emergency contact not found',
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Emergency contact deleted',
    });
  });
};
