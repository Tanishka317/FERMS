import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/database.js';

async function startServer() {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`\n=================================================`);
    console.log(`🚨 FERMS Backend API running on port ${config.port}`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`🩺 Health: http://localhost:${config.port}/api/health`);
    console.log(`=================================================\n`);
  });

  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
