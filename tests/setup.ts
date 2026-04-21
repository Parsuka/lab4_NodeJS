import mongoose from 'mongoose';

export async function setupTestDB() {
  await mongoose.connect(process.env.MONGODB_URI!);
}

export async function teardownTestDB() {
  await mongoose.connection.close();
}

export async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
