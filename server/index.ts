import { startServer } from './start';

const port = Number(process.env.PORT || 8787);
const { app, url } = await startServer({
  port,
  serveStatic: process.env.NODE_ENV === 'production',
});

console.log(`ccusage-dashboard API: ${url}`);

async function shutdown() {
  await app.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
