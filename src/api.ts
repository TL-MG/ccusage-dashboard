import type { SessionsResponse, UsageResponse } from '../shared/types';

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `请求失败（${response.status}）`);
  }
  return body as T;
}

export function getUsage(
  from: string,
  to: string,
  refresh = false,
  signal?: AbortSignal,
): Promise<UsageResponse> {
  const params = new URLSearchParams({ from, to });
  if (refresh) params.set('refresh', '1');
  return request(`/api/usage?${params}`, signal);
}

export function getSessions(
  agent: string,
  from: string,
  to: string,
  refresh = false,
  signal?: AbortSignal,
): Promise<SessionsResponse> {
  const params = new URLSearchParams({ agent, from, to });
  if (refresh) params.set('refresh', '1');
  return request(`/api/sessions?${params}`, signal);
}

export function getHealth(signal?: AbortSignal): Promise<{ ok: boolean; ccusageVersion: string }> {
  return request('/api/health', signal);
}
