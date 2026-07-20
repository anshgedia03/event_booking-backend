import { z } from 'zod';

export const getEventsQuerySchema = z
  .object({
    // 'all' or any specific category string — 'all' means no category filter
    category: z.string().trim().toLowerCase().optional(),
    search: z.string().trim().optional(),

    // Pagination — coerce string query params to numbers
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
      .default(6),
  })
  .strict();

export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
