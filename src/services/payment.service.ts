import crypto from 'crypto';
import mongoose from 'mongoose';
import Booking from '../models/booking.model';
import Event from '../models/event.model';
import PaymentOrder from '../models/payment-order.model';
import ApiError from '../utils/ApiError';
import { createBooking } from './booking.service';
import type {
  CreatePaymentOrderInput,
  VerifyPaymentInput,
} from '../validations/payment.validation';

type RazorpayOrderResponse = {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
};

type RazorpayErrorResponse = {
  error?: {
    code?: string;
    description?: string;
    field?: string;
    reason?: string;
    source?: string;
    step?: string;
  };
};

type PaymentConfig = {
  keyId: string;
  keySecret: string;
  currency: string;
};

export type CreatePaymentOrderResult = {
  keyId: string;
  orderId: string;
  amount: number;
  amountInRupees: number;
  currency: string;
  receipt: string;
  event: {
    _id: string;
    title: string;
    price: number;
    date?: Date;
    time?: string;
    venue?: string;
    image?: string;
    availableSeats?: number;
  };
  booking: {
    eventId: string;
    tickets: number;
    contactNumber: string;
    totalAmount: number;
  };
};

const getPaymentConfig = (): PaymentConfig => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const currency = process.env.RAZORPAY_CURRENCY || 'INR';

  if (!keyId || !keySecret) {
    throw new ApiError(
      500,
      'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
    );
  }

  return { keyId, keySecret, currency };
};

const getRazorpayErrorMessage = (body: unknown): string => {
  const responseBody = body as RazorpayErrorResponse | null;
  return (
    responseBody?.error?.description ||
    responseBody?.error?.reason ||
    'Unable to create payment order. Please try again.'
  );
};

const createRazorpayOrder = async (
  amount: number,
  currency: string,
  receipt: string,
  notes: Record<string, string>,
  config: PaymentConfig,
): Promise<RazorpayOrderResponse> => {
  const authToken = Buffer.from(
    `${config.keyId}:${config.keySecret}`,
  ).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | RazorpayOrderResponse
    | RazorpayErrorResponse
    | null;

  if (!response.ok) {
    throw new ApiError(502, getRazorpayErrorMessage(body));
  }

  if (!body || !('id' in body) || !body.id) {
    throw new ApiError(502, 'Invalid payment order response from Razorpay');
  }

  return body;
};

const assertBookingAllowed = async (
  userId: string,
  input: CreatePaymentOrderInput,
) => {
  const { eventId, tickets } = input;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, `'${eventId}' is not a valid event ID`);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  const available = event.availableSeats ?? 0;
  if (available < tickets) {
    throw new ApiError(
      400,
      `Only ${available} seat${available === 1 ? '' : 's'} available for this event`,
    );
  }

  const existingBookings = await Booking.find({
    userId,
    eventId,
    status: 'confirmed',
  });
  const alreadyBookedTickets = existingBookings.reduce(
    (sum, booking) => sum + booking.tickets,
    0,
  );

  if (alreadyBookedTickets + tickets > 5) {
    throw new ApiError(
      400,
      `You have already booked ${alreadyBookedTickets} tickets for this event. You can only book a maximum of 5 tickets per event.`,
    );
  }

  return event;
};

export const createPaymentOrder = async (
  userId: string,
  input: CreatePaymentOrderInput,
): Promise<CreatePaymentOrderResult> => {
  const config = getPaymentConfig();
  const event = await assertBookingAllowed(userId, input);
  const totalAmount = (event.price ?? 0) * input.tickets;

  if (totalAmount <= 0) {
    throw new ApiError(400, 'Payment is not required for this free event');
  }

  const amountInPaise = Math.round(totalAmount * 100);
  const receipt = `evt_${Date.now()}`;
  const razorpayOrder = await createRazorpayOrder(
    amountInPaise,
    config.currency,
    receipt,
    {
      userId,
      eventId: input.eventId,
      tickets: String(input.tickets),
    },
    config,
  );

  await PaymentOrder.create({
    userId: new mongoose.Types.ObjectId(userId),
    eventId: new mongoose.Types.ObjectId(input.eventId),
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: razorpayOrder.currency,
    receipt: razorpayOrder.receipt,
    tickets: input.tickets,
    contactNumber: input.contactNumber,
    status: 'created',
  });

  return {
    keyId: config.keyId,
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    amountInRupees: totalAmount,
    currency: razorpayOrder.currency,
    receipt: razorpayOrder.receipt,
    event: {
      _id: String(event._id),
      title: event.title,
      price: event.price ?? 0,
      date: event.date,
      time: event.time,
      venue: event.venue,
      image: event.image,
      availableSeats: event.availableSeats,
    },
    booking: {
      eventId: input.eventId,
      tickets: input.tickets,
      contactNumber: input.contactNumber,
      totalAmount,
    },
  };
};

const verifyRazorpaySignature = (
  input: VerifyPaymentInput,
  keySecret: string,
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature.length !== input.razorpay_signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(input.razorpay_signature),
  );
};

export const verifyPaymentAndCreateBooking = async (
  userId: string,
  input: VerifyPaymentInput,
) => {
  const config = getPaymentConfig();
  const paymentOrder = await PaymentOrder.findOne({
    razorpayOrderId: input.razorpay_order_id,
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!paymentOrder) {
    throw new ApiError(404, 'Payment order not found');
  }

  if (paymentOrder.status === 'paid' && paymentOrder.bookingId) {
    return {
      booking: await Booking.findById(paymentOrder.bookingId),
      payment: paymentOrder,
    };
  }

  const isValidSignature = verifyRazorpaySignature(input, config.keySecret);
  if (!isValidSignature) {
    paymentOrder.status = 'failed';
    await paymentOrder.save();
    throw new ApiError(400, 'Invalid payment signature');
  }

  const booking = await createBooking(userId, {
    eventId: String(paymentOrder.eventId),
    tickets: paymentOrder.tickets,
    contactNumber: paymentOrder.contactNumber,
  });

  paymentOrder.status = 'paid';
  paymentOrder.razorpayPaymentId = input.razorpay_payment_id;
  paymentOrder.bookingId = booking._id as mongoose.Types.ObjectId;
  await paymentOrder.save();

  return {
    booking,
    payment: paymentOrder,
  };
};
