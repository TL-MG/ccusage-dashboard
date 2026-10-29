export const TIME_ZONE = 'Asia/Shanghai';

export interface AgentMeta {
  id: string;
  label: string;
  color: string;
}

const agentMetadata: AgentMeta[] = [
  { id: 'claude', label: 'Claude Code', color: '#d97757' },
  { id: 'codex', label: 'Codex', color: '#10a37f' },
  { id: 'opencode', label: 'OpenCode', color: '#6366f1' },
  { id: 'amp', label: 'Amp', color: '#f59e0b' },
  { id: 'droid', label: 'Droid', color: '#0ea5e9' },
  { id: 'codebuff', label: 'Codebuff', color: '#ec4899' },
  { id: 'hermes', label: 'Hermes Agent', color: '#8b5cf6' },
  { id: 'pi', label: 'pi-agent', color: '#14b8a6' },
  { id: 'goose', label: 'Goose', color: '#84cc16' },
  { id: 'kilo', label: 'Kilo', color: '#f97316' },
  { id: 'qwen', label: 'Qwen', color: '#7c3aed' },
  { id: 'copilot', label: 'GitHub Copilot CLI', color: '#334155' },
  { id: 'gemini', label: 'Gemini CLI', color: '#4285f4' },
  { id: 'antigravity', label: 'Antigravity', color: '#06b6d4' },
  { id: 'kimi', label: 'Kimi', color: '#111827' },
  { id: 'openclaw', label: 'OpenClaw', color: '#ef4444' },
  { id: 'grok', label: 'Grok Build CLI', color: '#64748b' },
  { id: 'zcode', label: 'ZCode', color: '#a855f7' },
];

const fallbackColors = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'];

export const SUPPORTED_AGENTS = agentMetadata.map((agent) => agent.id);

export function getAgentMeta(id: string): AgentMeta {
  const known = agentMetadata.find((agent) => agent.id === id);
  if (known) return known;

  const hash = [...id].reduce((value, char) => value + char.charCodeAt(0), 0);
  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    color: fallbackColors[hash % fallbackColors.length],
  };
}

export type Granularity = 'daily' | 'weekly' | 'monthly';
export type MetricKey =
  | 'totalTokens'
  | 'inputTokens'
  | 'outputTokens'
  | 'cacheReadTokens'
  | 'cacheCreationTokens';

export interface TokenMetrics {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface AgentUsage extends TokenMetrics {
  agent: string;
  modelsUsed: string[];
}

export interface UsageRow extends TokenMetrics {
  period: string;
  startDate: string;
  endDate: string;
  agents: AgentUsage[];
  modelsUsed: string[];
}

export interface UsageResponse {
  range: { from: string; to: string; timeZone: string };
  generatedAt: string;
  daily: UsageRow[];
  weekly: UsageRow[];
  monthly: UsageRow[];
  agents: AgentMeta[];
  totals: TokenMetrics;
}

export interface SessionUsage extends TokenMetrics {
  sessionId: string;
  agent: string;
  projectPath: string;
  firstActivity: string | null;
  lastActivity: string | null;
  modelsUsed: string[];
}

export interface SessionsResponse {
  range: { from: string; to: string; timeZone: string };
  generatedAt: string;
  agent: string;
  sessions: SessionUsage[];
  warnings: string[];
}

export interface ApiErrorBody {
  error: string;
}
