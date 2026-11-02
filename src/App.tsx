import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Select,
  Segmented,
  Skeleton,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { getHealth, getUsage } from './api';
import UsageChart from './components/UsageChart';
import SessionDrawer, { type SessionSelection } from './components/SessionDrawer';
import {
  getAgentMeta,
  type AgentUsage,
  type Granularity,
  type MetricKey,
  type TokenMetrics,
  type UsageResponse,
  type UsageRow,
} from '../shared/types';
import {
  formatCompact,
  formatNumber,
  formatPeriodFull,
  metricMetadata,
  metricsForAgent,
  sumTokenMetrics,
} from './utils';

const { RangePicker } = DatePicker;
type DateRange = [Dayjs, Dayjs];
type ViewMode = 'agent' | 'time';
type ChartType = 'bar' | 'line';

interface DetailRow extends TokenMetrics {
  key: string;
  period: string;
  startDate: string;
  endDate: string;
  source: UsageRow;
  agent?: AgentUsage;
}

function makeDateRange(days: number): DateRange {
  const today = dayjs();
  return [today.subtract(days - 1, 'day'), today];
}

export default function App() {
  const [range, setRange] = useState<DateRange>(() => makeDateRange(30));
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [viewMode, setViewMode] = useState<ViewMode>('agent');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [metric, setMetric] = useState<MetricKey>('totalTokens');
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [version, setVersion] = useState<string | null>(null);
  const [sessionSelection, setSessionSelection] = useState<SessionSelection | null>(null);

  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');

  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then((health) => setVersion(health.ccusageVersion))
      .catch(() => {
        if (!controller.signal.aborted) setVersion(null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getUsage(from, to, refreshKey > 0, controller.signal)
      .then((data) => {
        setUsage(data);
        setSelectedAgent((current) =>
          current !== 'all' && !data.agents.some((agent) => agent.id === current) ? 'all' : current,
        );
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : '用量查询失败');
        setUsage(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [from, to, refreshKey]);

  const summary = useMemo(
    () => sumTokenMetrics((usage?.daily ?? []).map((row) => metricsForAgent(row, selectedAgent))),
    [selectedAgent, usage],
  );

  const currentRows = useMemo(() => usage?.[granularity] ?? [], [granularity, usage]);

  const tableRows = useMemo<DetailRow[]>(() => {
    const rows = viewMode === 'time'
      ? currentRows.map((row) => ({
          ...metricsForAgent(row, selectedAgent),
          key: row.period,
          period: row.period,
          startDate: row.startDate,
          endDate: row.endDate,
          source: row,
        }))
      : currentRows.flatMap((row) =>
          row.agents
            .filter((agent) => selectedAgent === 'all' || agent.agent === selectedAgent)
            .map((agent) => ({
              ...agent,
              key: `${row.period}:${agent.agent}`,
              period: row.period,
              startDate: row.startDate,
              endDate: row.endDate,
              source: row,
              agent,
            })),
        );

    return rows.sort((a, b) => b.period.localeCompare(a.period));
  }, [currentRows, selectedAgent, viewMode]);

  const openSessions = useCallback((row: UsageRow, agent?: string) => {
    setSessionSelection({
      agent: agent || selectedAgent,
      from: row.startDate,
      to: row.endDate,
      periodLabel: formatPeriodFull(row, granularity),
    });
  }, [granularity, selectedAgent]);

  const columns = useMemo<ColumnsType<DetailRow>>(() => [
    {
      title: '时间',
      key: 'period',
      fixed: 'left',
      width: granularity === 'weekly' ? 200 : 130,
      render: (_, row) => (
        <div className="period-cell">
          <strong>{row.period}</strong>
          {granularity === 'weekly' && <span>{row.startDate} ~ {row.endDate}</span>}
        </div>
      ),
    },
    ...(viewMode === 'agent'
      ? [{
          title: 'Agent',
          key: 'agent',
          width: 180,
          render: (_, row: DetailRow) => {
            const meta = getAgentMeta(row.agent?.agent || 'unknown');
            return (
              <span className="agent-name">
                <i style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
            );
          },
        } satisfies ColumnsType<DetailRow>[number]]
      : []),
    {
      title: 'Total Tokens',
      dataIndex: 'totalTokens',
      align: 'right',
      width: 145,
      sorter: (a, b) => a.totalTokens - b.totalTokens,
      render: (value: number) => <strong className="numeric strong">{formatNumber(value)}</strong>,
    },
    {
      title: 'Input',
      dataIndex: 'inputTokens',
      align: 'right',
      width: 125,
      sorter: (a, b) => a.inputTokens - b.inputTokens,
      render: (value: number) => <span className="numeric">{formatNumber(value)}</span>,
    },
    {
      title: 'Output',
      dataIndex: 'outputTokens',
      align: 'right',
      width: 125,
      sorter: (a, b) => a.outputTokens - b.outputTokens,
      render: (value: number) => <span className="numeric">{formatNumber(value)}</span>,
    },
    {
      title: 'Cache Read',
      dataIndex: 'cacheReadTokens',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.cacheReadTokens - b.cacheReadTokens,
      render: (value: number) => <span className="numeric muted">{formatNumber(value)}</span>,
    },
    {
      title: 'Cache Write',
      dataIndex: 'cacheCreationTokens',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.cacheCreationTokens - b.cacheCreationTokens,
      render: (value: number) => <span className="numeric muted">{formatNumber(value)}</span>,
    },
    {
      title: '',
      key: 'action',
      fixed: 'right',
      width: 105,
      render: (_, row) => (
        <Button
          type="text"
          className="session-link"
          onClick={() => openSessions(row.source, row.agent?.agent)}
        >
          查看会话 <RightOutlined />
        </Button>
      ),
    },
  ], [granularity, openSessions, viewMode]);

  function isPresetActive(days: number): boolean {
    const preset = makeDateRange(days);
    return from === preset[0].format('YYYY-MM-DD') && to === preset[1].format('YYYY-MM-DD');
  }

  const selectedAgentLabel = selectedAgent === 'all'
    ? '全部 Agent'
    : getAgentMeta(selectedAgent).label;

  const metricCards: Array<{
    key: MetricKey;
    label: string;
    english: string;
    icon: React.ReactNode;
    className?: string;
  }> = [
    { key: 'totalTokens', label: '总 Token', english: 'TOTAL TOKENS', icon: <ThunderboltOutlined />, className: 'primary' },
    { key: 'inputTokens', label: '输入 Token', english: 'INPUT', icon: <ArrowDownOutlined /> },
    { key: 'outputTokens', label: '输出 Token', english: 'OUTPUT', icon: <ArrowUpOutlined /> },
    { key: 'cacheReadTokens', label: '缓存读取', english: 'CACHE READ', icon: <DatabaseOutlined /> },
    { key: 'cacheCreationTokens', label: '缓存写入', english: 'CACHE WRITE', icon: <CloudUploadOutlined /> },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand-mark"><BarChartOutlined /></div>
            <div>
              <div className="brand-name">ccusage <span>UI</span></div>
              <div className="brand-tagline">CODING AGENT TOKEN OBSERVATORY</div>
            </div>
          </div>
          <div className="header-status">
            <Tag icon={<SafetyCertificateOutlined />} className="local-tag">本地数据 · 不上传</Tag>
            <span className={`connection-status ${version ? 'connected' : ''}`}>
              <i /> ccusage {version ? `v${version}` : '检查中'}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="filter-card" aria-label="查询条件">
          <div className="filter-group range-group">
            <span className="filter-label">时间范围</span>
            <Space wrap size={8}>
              <div className="preset-buttons">
                {[1, 7, 30, 90].map((days) => (
                  <Button
                    key={days}
                    size="small"
                    type={isPresetActive(days) ? 'primary' : 'text'}
                    onClick={() => setRange(makeDateRange(days))}
                  >
                    {days === 1 ? '今天' : `${days} 天`}
                  </Button>
                ))}
              </div>
              <RangePicker
                value={range}
                allowClear={false}
                onChange={(value) => {
                  if (value?.[0] && value[1]) setRange([value[0], value[1]]);
                }}
                disabledDate={(current) => current > dayjs().endOf('day')}
                format="YYYY-MM-DD"
              />
            </Space>
          </div>

          <div className="filter-group">
            <span className="filter-label">Agent</span>
            <Select
              value={selectedAgent}
              style={{ width: 180 }}
              onChange={setSelectedAgent}
              options={[
                { value: 'all', label: '全部 Agent' },
                ...(usage?.agents ?? []).map((agent) => ({ value: agent.id, label: agent.label })),
              ]}
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">时间粒度</span>
            <Segmented
              value={granularity}
              onChange={(value) => setGranularity(value as Granularity)}
              options={[
                { value: 'daily', label: '按日' },
                { value: 'weekly', label: '按周' },
                { value: 'monthly', label: '按月' },
              ]}
            />
          </div>

          <Button
            className="refresh-button"
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            刷新
          </Button>
        </section>

        {error && (
          <Alert
            className="page-alert"
            type="error"
            showIcon
            message="数据查询失败"
            description={error}
            action={<Button size="small" onClick={() => setRefreshKey((key) => key + 1)}>重试</Button>}
          />
        )}

        <section className="metrics-grid" aria-label="Token 总览">
          {metricCards.map((card) => (
            <div key={card.key} className={`metric-card ${card.className || ''}`}>
              <div className="metric-label">
                <span>{card.label}</span>
                <span className="metric-icon">{card.icon}</span>
              </div>
              {loading && !usage ? (
                <Skeleton.Input active size="small" style={{ width: 110, marginTop: 14 }} />
              ) : (
                <Tooltip title={`${formatNumber(summary[card.key])} tokens`}>
                  <div className="metric-value">{formatCompact(summary[card.key])}</div>
                </Tooltip>
              )}
              <div className="metric-footer">
                <span>{card.english}</span>
                <span className="metric-exact">{formatNumber(summary[card.key])}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="panel chart-panel">
          <div className="panel-header chart-header">
            <div>
              <h2>Token 用量趋势</h2>
              <p>{selectedAgentLabel} · {from} ~ {to} · 点击数据点查看会话</p>
            </div>
            <Space wrap size={12}>
              <Segmented
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
                options={[
                  { value: 'agent', label: <span><BarChartOutlined /> 按 Agent</span> },
                  { value: 'time', label: <span><LineChartOutlined /> 按时间</span> },
                ]}
              />
              <Segmented
                aria-label="图表类型"
                value={chartType}
                onChange={(value) => setChartType(value as ChartType)}
                options={[
                  { value: 'bar', label: <span><BarChartOutlined /> 柱状图</span> },
                  { value: 'line', label: <span><LineChartOutlined /> 折线图</span> },
                ]}
              />
              <Select
                value={metric}
                onChange={setMetric}
                style={{ width: 155 }}
                options={Object.entries(metricMetadata).map(([value, item]) => ({
                  value,
                  label: item.shortLabel,
                }))}
              />
            </Space>
          </div>

          <div className={`chart-content ${loading && usage ? 'is-updating' : ''}`}>
            {currentRows.length > 0 ? (
              <UsageChart
                rows={currentRows}
                granularity={granularity}
                viewMode={viewMode}
                chartType={chartType}
                selectedAgent={selectedAgent}
                metric={metric}
                onSelect={openSessions}
              />
            ) : !loading ? (
              <Empty description="所选时间范围内没有 Token 用量" style={{ padding: '80px 0' }} />
            ) : null}
            {loading && (
              <div className="chart-loading"><Spin description="正在读取 ccusage 数据…" /></div>
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="panel-header">
            <div>
              <h2>用量明细</h2>
              <p>{viewMode === 'agent' ? '按时间与 Agent 拆分' : '按时间汇总，不区分 Agent'}</p>
            </div>
            <span className="row-count">{tableRows.length} 行</span>
          </div>
          <Table<DetailRow>
            columns={columns}
            dataSource={tableRows}
            loading={loading && !usage}
            scroll={{ x: viewMode === 'agent' ? 1120 : 950 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              hideOnSinglePage: true,
              showTotal: (total) => `共 ${total} 行`,
            }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无明细数据" /> }}
          />
        </section>

        <footer className="page-footer">
          <span>Powered by ccusage · Token 口径与原生命令一致</span>
          <span>
            {usage?.generatedAt ? `更新于 ${dayjs(usage.generatedAt).format('HH:mm:ss')}` : '等待数据'}
            <i /> Asia/Shanghai
          </span>
        </footer>
      </main>

      <SessionDrawer selection={sessionSelection} onClose={() => setSessionSelection(null)} />
    </div>
  );
}
