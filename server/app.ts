import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import {
  getCcusageVersion,
  getSessions,
  getUsage,
  isSupportedAgent,
} from './ccusage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type RangeQuery = { from?: string; to?: string; refresh?: string };
type SessionQuery = RangeQuery & { agent?: string };

export interface BuildServerOptions {
  serveStatic?: boolean;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseRange(request: FastifyRequest<{ Querystring: RangeQuery }>) {
  const { from, to, refresh } = request.query;
  if (!from || !to || !validDate(from) || !validDate(to)) {
    throw Object.assign(new Error('请提供有效的 from / to 日期（YYYY-MM-DD）。'), { statusCode: 400 });
  }
  if (from > to) {
    throw Object.assign(new Error('开始日期不能晚于结束日期。'), { statusCode: 400 });
  }

  const dayCount = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (dayCount > 3660) {
    throw Object.assign(new Error('单次查询范围不能超过 10 年。'), { statusCode: 400 });
  }

  return { from, to, refresh: refresh === '1' };
}

export async function buildServer({ serveStatic = false }: BuildServerOptions = {}) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    if (_request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
  });

  app.get('/api/health', async () => ({
    ok: true,
    ccusageVersion: await getCcusageVersion(),
  }));

  app.get<{ Querystring: RangeQuery }>('/api/usage', async (request) => {
    const { from, to, refresh } = parseRange(request);
    return getUsage(from, to, refresh);
  });

  app.get<{ Querystring: SessionQuery }>('/api/sessions', async (request) => {
    const { from, to, refresh } = parseRange(request);
    const agent = request.query.agent || 'all';
    if (!isSupportedAgent(agent)) {
      throw Object.assign(new Error('不支持该 Agent。'), { statusCode: 400 });
    }
    return getSessions(agent, from, to, refresh);
  });

  app.setErrorHandler((caughtError, _request, reply) => {
    const error = caughtError as { statusCode?: number; message: string };
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) app.log.error(error);
    reply.status(statusCode).send({
      error: statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? '查询失败，请检查 ccusage 是否可用。'
        : error.message,
    });
  });

  if (serveStatic) {
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '..', 'dist', 'web'),
      prefix: '/',
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      return reply.status(404).send({ error: 'Not found' });
    });
  }

  return app;
}
