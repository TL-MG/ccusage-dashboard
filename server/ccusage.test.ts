import { describe, expect, it } from 'vitest';
import {
  getPeriodRange,
  normalizeSessionPayload,
  normalizeUsagePayload,
  sumMetrics,
} from './ccusage';

const metrics = {
  totalTokens: 120,
  inputTokens: 10,
  outputTokens: 20,
  cacheReadTokens: 70,
  cacheCreationTokens: 20,
};

describe('ccusage usage normalization', () => {
  it('normalizes all time sections and discovers agents', () => {
    const result = normalizeUsagePayload({
      daily: [{ period: '2026-10-29', ...metrics, agents: [{ agent: 'claude', ...metrics }] }],
      weekly: [{ period: '2026-10-26', ...metrics, agents: [{ agent: 'claude', ...metrics }] }],
      monthly: [{ period: '2026-10', ...metrics, agents: [{ agent: 'claude', ...metrics }] }],
    }, '2026-10-01', '2026-10-29');

    expect(result.daily).toHaveLength(29);
    expect(result.daily.find((row) => row.period === '2026-10-29')).toMatchObject({
      startDate: '2026-10-29',
      endDate: '2026-10-29',
    });
    expect(result.weekly).toHaveLength(5);
    expect(result.agents[0]).toMatchObject({ id: 'claude', label: 'Claude Code' });
    expect(result.totals).toEqual(metrics);
  });

  it('falls back to the filtered range for an unknown period', () => {
    expect(getPeriodRange('unknown', 'weekly', '2026-10-01', '2026-10-29')).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-29',
    });
  });
});

describe('continuous time axis', () => {
  it('fills missing dates with zero tokens without changing totals', () => {
    const result = normalizeUsagePayload({
      daily: [{ period: '2026-10-02', ...metrics, agents: [{ agent: 'claude', ...metrics }] }],
      weekly: [],
      monthly: [],
    }, '2026-10-01', '2026-10-03');

    expect(result.daily.map((row) => row.period)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
    for (const row of [result.daily[0], result.daily[2]]) {
      expect(row).toMatchObject({ totalTokens: 0, inputTokens: 0, outputTokens: 0, agents: [] });
    }
    expect(result.totals).toEqual(metrics);
  });

  it('creates complete daily, weekly, and monthly axes for an empty range', () => {
    const result = normalizeUsagePayload({
      daily: [],
      weekly: [],
      monthly: [],
    }, '2026-09-30', '2026-10-29');

    expect(result.daily).toHaveLength(30);
    expect(result.weekly.map((row) => row.period)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(result.monthly.map((row) => row.period)).toEqual(['2026-09', '2026-10']);
    expect(result.weekly[0]).toMatchObject({ startDate: '2026-09-30', endDate: '2026-10-04' });
    expect(result.weekly.at(-1)).toMatchObject({ startDate: '2026-10-26', endDate: '2026-10-29' });
    expect([...result.daily, ...result.weekly, ...result.monthly].every((row) => row.totalTokens === 0)).toBe(true);
  });
});

describe('period ranges', () => {
  it('clamps a week to the selected date window', () => {
    expect(getPeriodRange('2026-09-28', 'weekly', '2026-10-01', '2026-10-29')).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-04',
    });
  });

  it('calculates and clamps a month to the selected date window', () => {
    expect(getPeriodRange('2026-10', 'monthly', '2026-10-01', '2026-10-29')).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-29',
    });
    expect(getPeriodRange('2026-10', 'monthly', '2026-10-15', '2026-10-20')).toEqual({
      startDate: '2026-10-15',
      endDate: '2026-10-20',
    });
  });
});

describe('session normalization', () => {
  it('supports focused source sessions', () => {
    const sessions = normalizeSessionPayload({
      sessions: [{
        sessionId: 'session-1',
        projectPath: '/work/project',
        firstActivity: '2026-10-29T01:00:00Z',
        lastActivity: '2026-10-29T02:00:00Z',
        modelsUsed: ['k3.1-pro'],
        ...metrics,
      }],
    }, 'claude');

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      sessionId: 'session-1',
      agent: 'claude',
      projectPath: '/work/project',
      totalTokens: 120,
    });
  });

  it('supports unified session identifiers and metadata', () => {
    const [session] = normalizeSessionPayload({
      session: [{
        period: 'session-2',
        metadata: { projectPath: '/work/other', lastActivity: '2026-10-20T02:00:00Z' },
        modelBreakdowns: [{ modelName: 'model-a' }],
        ...metrics,
      }],
    }, 'codex');

    expect(session).toMatchObject({
      sessionId: 'session-2',
      projectPath: '/work/other',
      modelsUsed: ['model-a'],
    });
  });
});

describe('metric sums', () => {
  it('sums every token dimension', () => {
    expect(sumMetrics([metrics, metrics])).toEqual({
      totalTokens: 240,
      inputTokens: 20,
      outputTokens: 40,
      cacheReadTokens: 140,
      cacheCreationTokens: 40,
    });
  });
});
