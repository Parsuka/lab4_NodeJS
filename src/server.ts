import 'dotenv/config';
import app from './app';
import { connectDB, disconnectDB } from './config/database';

const PORT = process.env.PORT ?? 3000;

async function start() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Сервер запущено на http://localhost:${PORT}`);
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM отримано, завершення роботи...');
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Помилка запуску:', err);
    process.exit(1);
  }
}

start();
