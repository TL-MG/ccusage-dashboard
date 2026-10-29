import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CopyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { getSessions } from '../api';
import { getAgentMeta, type SessionUsage, type SessionsResponse } from '../../shared/types';
import { formatActivity, formatNumber, shortSessionId } from '../utils';

export interface SessionSelection {
  agent: string;
  from: string;
  to: string;
  periodLabel: string;
}

interface SessionDrawerProps {
  selection: SessionSelection | null;
  onClose: () => void;
}

export default function SessionDrawer({ selection, onClose }: SessionDrawerProps) {
  const [response, setResponse] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [messageApi, messageContext] = message.useMessage();

  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    setResponse(null);
    setLoading(true);
    setError(null);
    setQuery('');

    getSessions(
      selection.agent,
      selection.from,
      selection.to,
      refreshKey > 0,
      controller.signal,
    )
      .then(setResponse)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : '会话查询失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey, selection]);

  const filteredSessions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return response?.sessions ?? [];
    return (response?.sessions ?? []).filter((session) =>
      [
        session.sessionId,
        session.projectPath,
        session.modelsUsed.join(' '),
        getAgentMeta(session.agent).label,
      ].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [query, response]);

  async function copySessionId(sessionId: string) {
    try {
      await navigator.clipboard.writeText(sessionId);
      messageApi.success('Session ID 已复制');
    } catch {
      messageApi.error('复制失败，请手动复制');
    }
  }

  const columns: ColumnsType<SessionUsage> = [
    ...(selection?.agent === 'all'
      ? [{
          title: 'Agent',
          dataIndex: 'agent',
          width: 126,
          render: (agent: string) => {
            const meta = getAgentMeta(agent);
            return <Tag color={meta.color} style={{ color: agent === 'kimi' ? '#fff' : undefined }}>{meta.label}</Tag>;
          },
        } satisfies ColumnsType<SessionUsage>[number]]
      : []),
    {
      title: '会话 / 项目',
      key: 'session',
      width: 270,
      render: (_, session) => (
        <div className="session-cell">
          <Space size={6}>
            <Tooltip title={session.sessionId}>
              <span className="session-id">{shortSessionId(session.sessionId)}</span>
            </Tooltip>
            <Button
              type="text"
              size="small"
              aria-label="复制 Session ID"
              icon={<CopyOutlined />}
              onClick={() => copySessionId(session.sessionId)}
            />
          </Space>
          <Tooltip title={session.projectPath || '未提供项目路径'}>
            <div className="session-project">{session.projectPath || '未提供项目路径'}</div>
          </Tooltip>
          {session.modelsUsed.length > 0 && (
            <div className="session-models">{session.modelsUsed.join(' · ')}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Total Tokens',
      dataIndex: 'totalTokens',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.totalTokens - b.totalTokens,
      defaultSortOrder: 'descend',
      render: (value: number) => <strong className="numeric strong">{formatNumber(value)}</strong>,
    },
    {
      title: 'Input / Output',
      key: 'inputOutput',
      align: 'right',
      width: 165,
      render: (_, session) => (
        <div className="numeric dual-number">
          <span>入 {formatNumber(session.inputTokens)}</span>
          <span>出 {formatNumber(session.outputTokens)}</span>
        </div>
      ),
    },
    {
      title: 'Cache Read / Write',
      key: 'cache',
      align: 'right',
      width: 175,
      render: (_, session) => (
        <div className="numeric dual-number muted">
          <span>读 {formatNumber(session.cacheReadTokens)}</span>
          <span>写 {formatNumber(session.cacheCreationTokens)}</span>
        </div>
      ),
    },
    {
      title: '最后活动',
      dataIndex: 'lastActivity',
      width: 145,
      sorter: (a, b) => (a.lastActivity || '').localeCompare(b.lastActivity || ''),
      render: (value: string | null, session) => (
        <Tooltip title={`首次活动：${formatActivity(session.firstActivity)}\n最后活动：${formatActivity(session.lastActivity)}`}>
          <span className="activity-time">{value ? formatActivity(value).slice(5, 16) : '—'}</span>
        </Tooltip>
      ),
    },
  ];

  const agentMeta = selection?.agent && selection.agent !== 'all'
    ? getAgentMeta(selection.agent)
    : null;

  return (
    <Drawer
      className="session-drawer"
      size={960}
      open={Boolean(selection)}
      onClose={onClose}
      title={
        <div className="drawer-title">
          <span>会话用量明细</span>
          <div className="drawer-subtitle">
            {agentMeta ? <Tag color={agentMeta.color}>{agentMeta.label}</Tag> : <Tag>全部 Agent</Tag>}
            <span>{selection?.periodLabel}</span>
          </div>
        </div>
      }
      extra={
        <Button
          icon={<ReloadOutlined spin={loading} />}
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={!selection || loading}
        >
          刷新
        </Button>
      }
      footer={
        <div className="drawer-footer">
          <span>{selection?.from} ~ {selection?.to} · Asia/Shanghai</span>
          <span>共 {filteredSessions.length} 个会话</span>
        </div>
      }
    >
      {messageContext}
      <div className="session-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索 Session ID、项目路径或模型"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          size="large"
        />
      </div>

      {response?.warnings.map((warning) => (
        <Alert key={warning} type="warning" showIcon message={warning} style={{ marginBottom: 12 }} />
      ))}
      {error && (
        <Alert
          type="error"
          showIcon
          message="会话查询失败"
          description={error}
          action={<Button onClick={() => setRefreshKey((key) => key + 1)}>重试</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        <Table<SessionUsage>
          columns={columns}
          dataSource={filteredSessions}
          rowKey={(session) => `${session.agent}:${session.sessionId}`}
          scroll={{ x: 850 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            hideOnSinglePage: true,
          }}
          locale={{
            emptyText: loading
              ? '正在读取会话…'
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该时间范围内没有会话数据" />,
          }}
        />
      </Spin>
    </Drawer>
  );
}
