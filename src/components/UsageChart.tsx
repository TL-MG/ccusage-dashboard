import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import { getAgentMeta, type Granularity, type MetricKey, type UsageRow } from '../../shared/types';
import { formatCompact, formatNumber, formatPeriod, metricsForAgent, metricMetadata } from '../utils';

echarts.use([
  BarChart,
  LineChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

type ViewMode = 'agent' | 'time';

interface UsageChartProps {
  rows: UsageRow[];
  granularity: Granularity;
  viewMode: ViewMode;
  selectedAgent: string;
  metric: MetricKey;
  onSelect: (row: UsageRow, agent?: string) => void;
}

export default function UsageChart({
  rows,
  granularity,
  viewMode,
  selectedAgent,
  metric,
  onSelect,
}: UsageChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  const agentIds = useMemo(() => {
    if (selectedAgent !== 'all') return [selectedAgent];
    return [...new Set(rows.flatMap((row) => row.agents.map((agent) => agent.agent)))].sort();
  }, [rows, selectedAgent]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const showZoom = rows.length > 20;
    const series = viewMode === 'agent'
      ? agentIds.map((agentId) => {
          const meta = getAgentMeta(agentId);
          return {
            name: meta.label,
            type: 'bar' as const,
            stack: 'tokens',
            barMaxWidth: 42,
            emphasis: { focus: 'series' as const },
            itemStyle: { color: meta.color },
            data: rows.map((row) =>
              row.agents.find((agent) => agent.agent === agentId)?.[metric] ?? 0,
            ),
          };
        })
      : [{
          name: selectedAgent === 'all' ? '全部 Agent' : getAgentMeta(selectedAgent).label,
          type: 'line' as const,
          smooth: 0.25,
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: rows.length <= 45,
          lineStyle: { width: 3, color: '#5b5bd6' },
          itemStyle: { color: '#5b5bd6', borderColor: '#ffffff', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(91, 91, 214, 0.28)' },
                { offset: 1, color: 'rgba(91, 91, 214, 0.02)' },
              ],
            },
          },
          data: rows.map((row) => metricsForAgent(row, selectedAgent)[metric]),
        }];

    const option: EChartsCoreOption = {
      animationDuration: 450,
      aria: { enabled: true },
      color: agentIds.map((id) => getAgentMeta(id).color),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: viewMode === 'agent' ? 'shadow' : 'line' },
        confine: true,
        valueFormatter: (value: unknown) => `${formatNumber(Number(value))} tokens`,
      },
      legend: {
        show: viewMode === 'agent' && agentIds.length > 0,
        top: 0,
        type: 'scroll',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#667085' },
      },
      grid: {
        left: 16,
        right: 20,
        top: viewMode === 'agent' ? 48 : 24,
        bottom: showZoom ? 48 : 16,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: rows.map((row) => formatPeriod(row.period, granularity)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e5e9f0' } },
        axisLabel: { color: '#7b8495', hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        name: metricMetadata[metric].shortLabel,
        nameTextStyle: { color: '#98a2b3', padding: [0, 0, 8, 0] },
        axisLabel: { color: '#7b8495', formatter: (value: number) => formatCompact(value) },
        splitLine: { lineStyle: { color: '#edf0f5', type: 'dashed' } },
      },
      dataZoom: showZoom
        ? [
            { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true },
            {
              type: 'slider',
              height: 18,
              bottom: 4,
              borderColor: 'transparent',
              backgroundColor: '#f5f6fa',
              fillerColor: 'rgba(91, 91, 214, 0.16)',
              handleStyle: { color: '#5b5bd6' },
              textStyle: { color: '#98a2b3' },
            },
          ]
        : [{ type: 'inside', start: 0, end: 100 }],
      series,
    };

    chart.setOption(option, { notMerge: true });
    chart.off('click');
    chart.on('click', (params) => {
      const dataIndex = params.dataIndex;
      if (typeof dataIndex !== 'number' || !rows[dataIndex]) return;
      const seriesIndex = typeof params.seriesIndex === 'number' ? params.seriesIndex : 0;
      const agent = viewMode === 'agent' ? agentIds[seriesIndex] : selectedAgent;
      onSelect(rows[dataIndex], agent || selectedAgent);
    });
  }, [agentIds, granularity, metric, onSelect, rows, selectedAgent, viewMode]);

  return <div ref={containerRef} className="usage-chart" role="img" aria-label="Token 用量趋势图" />;
}
