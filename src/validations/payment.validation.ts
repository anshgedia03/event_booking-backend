import { z } from 'zod';
import { createBookingSchema } from './booking.validation';

export const createPaymentOrderSchema = createBookingSchema;

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;

export const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z
      .string({ error: 'razorpay_order_id is required' })
      .trim()
      .min(1, 'razorpay_order_id is required'),
    razorpay_payment_id: z
      .string({ error: 'razorpay_payment_id is required' })
      .trim()
      .min(1, 'razorpay_payment_id is required'),
    razorpay_signature: z
      .string({ error: 'razorpay_signature is required' })
      .trim()
      .min(1, 'razorpay_signature is required'),
  })
  .strict();

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
