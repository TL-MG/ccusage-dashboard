import dayjs from 'dayjs';
import type {
  Granularity,
  MetricKey,
  TokenMetrics,
  UsageRow,
} from '../shared/types';

export const metricMetadata: Record<MetricKey, { label: string; shortLabel: string }> = {
  totalTokens: { label: 'Total Tokens', shortLabel: 'Total' },
  inputTokens: { label: 'Input Tokens', shortLabel: 'Input' },
  outputTokens: { label: 'Output Tokens', shortLabel: 'Output' },
  cacheReadTokens: { label: 'Cache Read Tokens', shortLabel: 'Cache Read' },
  cacheCreationTokens: { label: 'Cache Creation Tokens', shortLabel: 'Cache Write' },
};

export const emptyMetrics = (): TokenMetrics => ({
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
});

export function sumTokenMetrics(rows: TokenMetrics[]): TokenMetrics {
  return rows.reduce<TokenMetrics>((total, row) => ({
    totalTokens: total.totalTokens + row.totalTokens,
    inputTokens: total.inputTokens + row.inputTokens,
    outputTokens: total.outputTokens + row.outputTokens,
    cacheReadTokens: total.cacheReadTokens + row.cacheReadTokens,
    cacheCreationTokens: total.cacheCreationTokens + row.cacheCreationTokens,
  }), emptyMetrics());
}

export function metricsForAgent(row: UsageRow, agent: string): TokenMetrics {
  if (agent === 'all' && row.agents.length === 0) {
    const { totalTokens, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } = row;
    return { totalTokens, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens };
  }

  return sumTokenMetrics(
    row.agents.filter((item) => agent === 'all' || item.agent === agent),
  );
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatCompact(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value);
}

export function formatPeriod(period: string, granularity: Granularity): string {
  if (granularity === 'daily') return dayjs(period).format('MM-DD');
  if (granularity === 'weekly') return `${dayjs(period).format('MM-DD')} 周`;
  return period;
}

export function formatPeriodFull(row: Pick<UsageRow, 'period' | 'startDate' | 'endDate'>, granularity: Granularity): string {
  if (granularity === 'daily') return row.period;
  if (granularity === 'monthly') return row.period;
  return `${row.startDate} ~ ${row.endDate}`;
}

export function formatActivity(value: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}

export function shortSessionId(value: string): string {
  if (value.length <= 30) return value;
  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}
