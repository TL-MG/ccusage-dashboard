import { describe, expect, it } from 'vitest';
import type { UsageRow } from '../shared/types';
import {
  formatCompact,
  metricsForAgent,
  sumTokenMetrics,
} from './utils';

const claude = {
  agent: 'claude',
  modelsUsed: [],
  totalTokens: 100,
  inputTokens: 10,
  outputTokens: 20,
  cacheReadTokens: 60,
  cacheCreationTokens: 10,
};

const codex = {
  agent: 'codex',
  modelsUsed: [],
  totalTokens: 50,
  inputTokens: 5,
  outputTokens: 10,
  cacheReadTokens: 30,
  cacheCreationTokens: 5,
};

const row: UsageRow = {
  period: '2026-10-29',
  startDate: '2026-10-29',
  endDate: '2026-10-29',
  modelsUsed: [],
  agents: [claude, codex],
  totalTokens: 150,
  inputTokens: 15,
  outputTokens: 30,
  cacheReadTokens: 90,
  cacheCreationTokens: 15,
};

describe('dashboard metric aggregation', () => {
  it('aggregates all agents', () => {
    expect(metricsForAgent(row, 'all').totalTokens).toBe(150);
    expect(metricsForAgent(row, 'all').cacheReadTokens).toBe(90);
  });

  it('selects a single agent', () => {
    expect(metricsForAgent(row, 'claude')).toEqual({
      totalTokens: 100,
      inputTokens: 10,
      outputTokens: 20,
      cacheReadTokens: 60,
      cacheCreationTokens: 10,
    });
    expect(metricsForAgent(row, 'missing').totalTokens).toBe(0);
  });

  it('sums multiple periods', () => {
    expect(sumTokenMetrics([claude, codex]).totalTokens).toBe(150);
  });
});

describe('number formatting', () => {
  it('formats compact values', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1200)).toBe('1.2K');
    expect(formatCompact(2_500_000)).toBe('2.50M');
  });
});
