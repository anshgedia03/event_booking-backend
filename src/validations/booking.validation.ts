import { z } from 'zod';

export const createBookingSchema = z
  .object({
    eventId: z
      .string({ error: 'Event ID is required' })
      .length(24, 'eventId must be a valid MongoDB ObjectId (24 hex characters)')
      .regex(/^[a-fA-F0-9]{24}$/, 'eventId must be a valid MongoDB ObjectId'),

    tickets: z.coerce
      .number({ error: 'tickets must be a number' })
      .int('tickets must be a whole number')
      .min(1, 'At least 1 ticket must be booked')
      .max(5, 'Cannot book more than 5 tickets at once'),

    contactNumber: z
      .string({ error: 'Contact number is required' })
      .trim()
      .min(7, 'Contact number must be at least 7 digits')
      .max(15, 'Contact number must not exceed 15 digits')
      .regex(/^[+\d\s\-()]{7,15}$/, 'Please provide a valid contact number'),
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const getUserBookingsQuerySchema = z
  .object({
    status: z.enum(['upcoming', 'past', 'all']).optional().default('all'),
    page: z.coerce
      .number({ error: 'page must be a number' })
      .int('page must be an integer')
      .min(1, 'page must be at least 1')
      .default(1),
    limit: z.coerce
      .number({ error: 'limit must be a number' })
      .int('limit must be an integer')
      .min(1, 'limit must be at least 1')
      .max(50, 'limit must not exceed 50')
      .default(10),
  })
  .strict();

export type GetUserBookingsQuery = z.infer<typeof getUserBookingsQuerySchema>;
