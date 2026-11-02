import type { FastifyInstance } from 'fastify';
import { buildServer } from './app';

export interface StartServerOptions {
  port?: number;
  host?: string;
  serveStatic?: boolean;
}

export async function startServer({
  port = 8787,
  host = '127.0.0.1',
  serveStatic = false,
}: StartServerOptions = {}): Promise<{ app: FastifyInstance; url: string }> {
  const app = await buildServer({ serveStatic });
  await app.listen({ host, port });

  const address = app.server.address();
  const actualPort = address && typeof address === 'object' ? address.port : port;
  const urlHost = host.includes(':') ? `[${host}]` : host;
  return { app, url: `http://${urlHost}:${actualPort}` };
}
