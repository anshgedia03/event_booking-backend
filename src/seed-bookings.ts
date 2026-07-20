import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.model';
import Event from './models/event.model';
import Booking from './models/booking.model';
import { createBooking } from './services/booking.service';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://anshg_db:ansh030904@cluster0.8vkos7h.mongodb.net/event-book';

async function seedBookings() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Find the user (using the email we've been testing with)
    const user = await User.findOne({ email: 'ansh@example.com' });
    if (!user) {
      console.error('❌ User ansh@example.com not found. Please create the user first.');
      process.exit(1);
    }
    console.log(`👤 Found user: ${user.name} (${user._id})`);

    // Fetch all events
    const allEvents = await Event.find();
    console.log(`📅 Total events in database: ${allEvents.length}`);

    // Fetch events already booked by this user
    const userBookings = await Booking.find({ userId: user._id, status: 'confirmed' });
    const bookedEventIds = new Set(userBookings.map((b) => b.eventId.toString()));

    // Filter to events not yet booked
    const remainingEvents = allEvents.filter((e) => !bookedEventIds.has(e._id.toString()));
    console.log(`🎫 Events left to book: ${remainingEvents.length}`);

    if (remainingEvents.length === 0) {
      console.log('🎉 User has already booked all available events!');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    // Book 1 ticket for each remaining event
    for (const event of remainingEvents) {
      try {
        await createBooking(user._id.toString(), {
          eventId: event._id.toString(),
          tickets: 1,
          contactNumber: '9876543210',
        });
        successCount++;
        process.stdout.write(`\r✅ Booked: ${successCount}/${remainingEvents.length}`);
      } catch (error: any) {
        console.error(`\n❌ Failed to book ${event.title}: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n\n🎯 Finished! Successfully booked ${successCount} events. (Failed: ${failCount})`);
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedBookings();
