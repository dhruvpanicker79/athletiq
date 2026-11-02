import app, { ready } from './app.js';

const PORT = process.env.PORT || 5050;
await ready();
app.listen(PORT, () => console.log(`✓ ATHLETIQ API on http://localhost:${PORT}`));
