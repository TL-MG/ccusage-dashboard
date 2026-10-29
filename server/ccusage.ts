import { execFile } from 'node:child_process';
import {
  getAgentMeta,
  SUPPORTED_AGENTS,
  TIME_ZONE,
  type AgentUsage,
  type Granularity,
  type SessionUsage,
  type SessionsResponse,
  type TokenMetrics,
  type UsageResponse,
  type UsageRow,
} from '../shared/types';

const CCUSAGE_BIN = process.env.CCUSAGE_BIN || 'ccusage';
const CACHE_TTL_MS = 30_000;
const MAX_BUFFER = 64 * 1024 * 1024;

type UnknownRecord = Record<string, unknown>;
type CacheEntry<T> = { expiresAt: number; promise: Promise<T> };

const usageCache = new Map<string, CacheEntry<UsageResponse>>();
const sessionCache = new Map<string, CacheEntry<SessionsResponse>>();
let versionCache: Promise<string> | undefined;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeModels(raw: UnknownRecord): string[] {
  if (Array.isArray(raw.modelsUsed)) {
    return raw.modelsUsed.filter((model): model is string => typeof model === 'string');
  }

  return asArray(raw.modelBreakdowns)
    .map((item) => {
      const breakdown = asRecord(item);
      return breakdown.modelName ?? breakdown.model;
    })
    .filter((model): model is string => typeof model === 'string');
}

function normalizeMetrics(value: unknown): TokenMetrics {
  const raw = asRecord(value);
  const inputTokens = toNumber(raw.inputTokens);
  const outputTokens = toNumber(raw.outputTokens);
  const cacheReadTokens = toNumber(raw.cacheReadTokens);
  const cacheCreationTokens = toNumber(raw.cacheCreationTokens);

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    totalTokens:
      typeof raw.totalTokens === 'number'
        ? toNumber(raw.totalTokens)
        : inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens,
  };
}

export function sumMetrics(rows: TokenMetrics[]): TokenMetrics {
  return rows.reduce<TokenMetrics>(
    (total, row) => ({
      totalTokens: total.totalTokens + row.totalTokens,
      inputTokens: total.inputTokens + row.inputTokens,
      outputTokens: total.outputTokens + row.outputTokens,
      cacheReadTokens: total.cacheReadTokens + row.cacheReadTokens,
      cacheCreationTokens: total.cacheCreationTokens + row.cacheCreationTokens,
    }),
    {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    },
  );
}

function normalizeAgent(value: unknown): AgentUsage {
  return {
    ...normalizeMetrics(value),
    agent: String(asRecord(value).agent || 'unknown'),
    modelsUsed: normalizeModels(asRecord(value)),
  };
}

function parseDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function getPeriodRange(
  period: string,
  granularity: Granularity,
  filterFrom: string,
  filterTo: string,
): { startDate: string; endDate: string } {
  let start = parseDate(period);
  let end: Date | undefined = start;

  if (granularity === 'monthly') {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      start = new Date(Date.UTC(year, month - 1, 1));
      end = new Date(Date.UTC(year, month, 0));
    }
  } else if (granularity === 'weekly' && start) {
    end = addDays(start, 6);
  }

  const startDate = start ? formatDate(start) : filterFrom;
  const endDate = end ? formatDate(end) : filterTo;
  return {
    startDate: startDate < filterFrom ? filterFrom : startDate,
    endDate: endDate > filterTo ? filterTo : endDate,
  };
}

function normalizeUsageRows(
  value: unknown,
  granularity: Granularity,
  from: string,
  to: string,
): UsageRow[] {
  return asArray(value).map((item) => {
    const raw = asRecord(item);
    const period = String(raw.period || '');
    const agents = asArray(raw.agents).map(normalizeAgent);
    const metrics = normalizeMetrics(raw);

    return {
      ...metrics,
      period,
      ...getPeriodRange(period, granularity, from, to),
      agents,
      modelsUsed: normalizeModels(raw),
    };
  });
}

export function normalizeUsagePayload(
  payload: unknown,
  from: string,
  to: string,
): Omit<UsageResponse, 'generatedAt' | 'range'> {
  const raw = asRecord(payload);
  const daily = normalizeUsageRows(raw.daily, 'daily', from, to);
  const weekly = normalizeUsageRows(raw.weekly, 'weekly', from, to);
  const monthly = normalizeUsageRows(raw.monthly, 'monthly', from, to);
  const agentIds = [...daily, ...weekly, ...monthly].flatMap((row) =>
    row.agents.map((agent) => agent.agent),
  );

  return {
    daily,
    weekly,
    monthly,
    agents: [...new Set(agentIds)].sort().map(getAgentMeta),
    totals: sumMetrics(daily),
  };
}

export function normalizeSessionPayload(payload: unknown, agent: string): SessionUsage[] {
  const raw = asRecord(payload);
  const rows = Array.isArray(raw.sessions) ? raw.sessions : asArray(raw.session);

  return rows.map((item) => {
    const session = asRecord(item);
    const metadata = asRecord(session.metadata);
    return {
      ...normalizeMetrics(session),
      sessionId: String(session.sessionId ?? session.period ?? 'unknown'),
      agent: String(session.agent ?? agent),
      projectPath: String(session.projectPath ?? metadata.projectPath ?? ''),
      firstActivity: toOptionalString(session.firstActivity ?? metadata.firstActivity),
      lastActivity: toOptionalString(session.lastActivity ?? metadata.lastActivity),
      modelsUsed: normalizeModels(session),
    };
  });
}

function runCcusage(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      CCUSAGE_BIN,
      args,
      {
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: MAX_BUFFER,
        windowsHide: true,
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(`ccusage 执行失败：${detail}`));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

async function runJson(args: string[]): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const output = await runCcusage(args);
      try {
        return JSON.parse(output);
      } catch {
        throw new Error('ccusage 返回了无法解析的 JSON，请检查本机 ccusage 安装。');
      }
    } catch (error) {
      if (attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error('ccusage 查询失败。');
}

function cached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  refresh: boolean,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (!refresh && existing && existing.expiresAt > Date.now()) return existing.promise;

  const promise = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });

  if (cache.size > 30) {
    for (const [cachedKey, value] of cache) {
      if (cachedKey !== key && value.expiresAt <= Date.now()) cache.delete(cachedKey);
    }
  }
  return promise;
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function dateArgs(from: string, to: string): string[] {
  return ['--since', compactDate(from), '--until', compactDate(to), '--timezone', TIME_ZONE];
}

export function getUsage(from: string, to: string, refresh = false): Promise<UsageResponse> {
  return cached(usageCache, `${from}:${to}`, refresh, async () => {
    const payload = await runJson([
      'daily',
      '--json',
      '--by-agent',
      '--sections',
      'daily,weekly,monthly',
      ...dateArgs(from, to),
    ]);

    return {
      ...normalizeUsagePayload(payload, from, to),
      range: { from, to, timeZone: TIME_ZONE },
      generatedAt: new Date().toISOString(),
    };
  });
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index]);
      }
    }),
  );
  return results;
}

export function getSessions(
  agent: string,
  from: string,
  to: string,
  refresh = false,
): Promise<SessionsResponse> {
  return cached(sessionCache, `${agent}:${from}:${to}`, refresh, async () => {
    const agents =
      agent === 'all'
        ? (await getUsage(from, to, refresh)).agents.map((item) => item.id)
        : [agent];

    const results = await mapLimit(agents, 3, async (agentId) => {
      try {
        const payload = await runJson([agentId, 'session', '--json', ...dateArgs(from, to)]);
        return { sessions: normalizeSessionPayload(payload, agentId), warning: null };
      } catch (error) {
        if (agent !== 'all') throw error;
        return {
          sessions: [],
          warning: `${getAgentMeta(agentId).label}: ${error instanceof Error ? error.message : '查询失败'}`,
        };
      }
    });

    const sessions = results
      .flatMap((result) => result.sessions)
      .sort((a, b) => b.totalTokens - a.totalTokens || a.sessionId.localeCompare(b.sessionId));

    return {
      agent,
      range: { from, to, timeZone: TIME_ZONE },
      generatedAt: new Date().toISOString(),
      sessions,
      warnings: results.flatMap((result) => (result.warning ? [result.warning] : [])),
    };
  });
}

export function getCcusageVersion(): Promise<string> {
  if (!versionCache) {
    versionCache = runCcusage(['--version'])
      .then((output) => output.trim().replace(/^ccusage\s+/, ''))
      .catch((error) => {
        versionCache = undefined;
        throw error;
      });
  }
  return versionCache;
}

export function isSupportedAgent(agent: string): boolean {
  return agent === 'all' || SUPPORTED_AGENTS.includes(agent);
}
