import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/recipes';
  await mongoose.connect(uri);
  console.log('MongoDB підключено');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  console.log('MongoDB відключено');
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB помилка:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn("MongoDB з'єднання розірвано");
});
