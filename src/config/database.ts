import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URL;

  if (!mongoURI) {
    console.error('❌  MONGODB_URL is not defined in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Fail fast if Atlas is unreachable
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌  MongoDB connection failed: ${message}`);
    process.exit(1);
  }
};

// Gracefully close connection on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌  MongoDB connection closed (SIGINT)');
  process.exit(0);
});

export default connectDB;
