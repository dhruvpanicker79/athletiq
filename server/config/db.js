import mongoose from 'mongoose';

// Unknown filter fields are dropped. Operator injection ($gt, $ne, ...) is stripped by middleware/sanitize.js
mongoose.set('strictQuery', true);

async function useLocal(reason) {
  const { startLocalDb } = await import('./localdb.js');
  const port = Number(process.env.LOCAL_DB_PORT) || 27027;
  // If another ATHLETIQ process (e.g. the API while running the seed script) already hosts it, share that one
  const uri = await startLocalDb(port).catch((e) => {
    if (e.code === 'EADDRINUSE') return `mongodb://127.0.0.1:${port}/athletiq`;
    throw e;
  });
  console.log(`⚠  ${reason} — using the built-in local database (saved to server/.data/athletiq.json)`);
  await mongoose.connect(uri, { directConnection: true });
}

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri === 'local' || uri === 'memory') await useLocal(uri ? `MONGO_URI=${uri}` : 'MONGO_URI not set');
  else {
    try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 }); }
    catch (e) {
      if (process.env.NODE_ENV === 'production') throw e;
      await mongoose.disconnect().catch(() => {});
      await useLocal(`Could not reach MongoDB at ${uri.replace(/\/\/.*@/, '//***@')}`);
    }
  }
  console.log('✓ Database connected');
}

export const jwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  return 'dev-only-insecure-secret';
};
