import mongoose, { Document, Schema } from 'mongoose';

export type PaymentOrderStatus = 'created' | 'paid' | 'failed';

export interface IPaymentOrder extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  receipt: string;
  tickets: number;
  contactNumber: string;
  status: PaymentOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentOrderSchema = new Schema<IPaymentOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      unique: true,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
      default: 'INR',
    },
    receipt: {
      type: String,
      required: [true, 'Receipt is required'],
      trim: true,
    },
    tickets: {
      type: Number,
      required: [true, 'Number of tickets is required'],
      min: [1, 'At least 1 ticket must be booked'],
      max: [5, 'Cannot book more than 5 tickets at once'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const PaymentOrder = mongoose.model<IPaymentOrder>(
  'PaymentOrder',
  PaymentOrderSchema,
);

export default PaymentOrder;
