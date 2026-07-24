import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  bookings: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: false,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    bookings: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Booking', // Reference to Booking collection
      },
    ],
  },
  {
    timestamps: true, // Automatically manage createdAt & updatedAt
  },
);

// Pre-save hook: Hash password before saving
UserSchema.pre<IUser>('save', async function () {
  // Only hash if the password exists and was actually modified
  if (!this.password || !this.isModified('password')) return;

  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

// Instance method: compare plain password with hashed password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password as string);
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
