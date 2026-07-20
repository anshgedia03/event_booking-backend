import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  category: string;
  description?: string;
  date?: Date;
  time?: string;
  venue?: string;
  organizer?: string;
  availableSeats?: number;
  totalSeats: number;
  price?: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      lowercase: true,
      trim: true,
      index: true, // Efficient filtering by category
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
    },
    time: {
      type: String,
      trim: true,
    },
    venue: {
      type: String,
      trim: true,
    },
    organizer: {
      type: String,
      trim: true,
    },
    availableSeats: {
      type: Number,
    },
    totalSeats: {
      type: Number,
      default: 100,
    },
    price: {
      type: Number,
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Event = mongoose.model<IEvent>('Event', EventSchema);
export default Event;
