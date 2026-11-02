// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json)
import app, { ready } from '../server/app.js';

export default async function handler(req, res) {
  await ready();
  return app(req, res);
}
