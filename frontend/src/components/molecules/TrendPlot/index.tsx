'use client';

import { useId, useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceDot,
} from 'recharts';

export default function TrendPlot({
  data,
  unit = '점',
  label,
  height = 200,
}: {
  data: Array<{ date: string; value: number }>;
  unit?: string;
  label: string;
  height?: number;
}) {
  const gradientId = `trend-${useId().replace(/:/g, '')}`;
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useInView(containerRef, { once: true, amount: 0.25 });
  const scrollable = data.length > 5;
  const latest = data[data.length - 1];
  const chart = (
    <AreaChart
      data={data}
      {...(scrollable ? { width: data.length * 72, height } : {})}
      margin={{ top: 32, right: 22, left: 0, bottom: 0 }}
      accessibilityLayer
    >
      <defs>
        <linearGradient id={`${gradientId}-tooth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E4F3FF" />
        </linearGradient>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#638FE7" stopOpacity={0.65} />
          <stop offset="45%" stopColor="#8FB6F3" stopOpacity={0.36} />
          <stop offset="80%" stopColor="#ADE1EC" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#E0F2F8" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#E9EFF6" />
      <XAxis
        dataKey="date"
        tick={({ x, y, payload }) => (
          <g transform={`translate(${x}, ${y})`}>
            {payload.value === latest?.date && (
              <rect x={-25} y={-2} width={50} height={21} rx={8} fill="#EAF1FC" />
            )}
            <text
              textAnchor="middle"
              y={12}
              fontSize={11}
              fontWeight={payload.value === latest?.date ? 700 : 500}
              fill={payload.value === latest?.date ? '#4E73AA' : '#788BA4'}
            >
              {payload.value}
            </text>
            {payload.value === latest?.date && (
              <text textAnchor="middle" y={32} fontSize={10} fontWeight={600} fill="#627DA5">
                최근
              </text>
            )}
          </g>
        )}
        axisLine={false}
        tickLine={false}
        tickMargin={12}
        height={48}
      />
      <YAxis
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
        tick={{ fontSize: 10, fill: '#91A0B4' }}
        axisLine={false}
        tickLine={false}
        width={28}
      />
      <Tooltip
        isAnimationActive={false}
        cursor={false}
        content={({ active, payload, label: date }) =>
          active && payload?.length ? (
            <div className="rounded-xl border border-hairline bg-white px-3.5 py-2.5 shadow-card">
              <p className="mb-1 mt-0 text-[11px] font-medium text-[#788BA4]">{date}</p>
              <strong className="text-[17px] font-bold tabular-nums text-[#4C7EC8]">
                {String(payload[0].value)}
                <span className="ml-1 text-[12px]">{unit}</span>
              </strong>
            </div>
          ) : null
        }
      />
      <Area
        type="linear"
        dataKey="value"
        stroke="#5B86D6"
        strokeWidth={2.5}
        fill={`url(#${gradientId})`}
        fillOpacity={1}
        dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) =>
          index === data.length - 1 ? (
            <g key={index} />
          ) : (
            <circle key={index} cx={cx} cy={cy} r={3} fill="#4C7EC8" stroke="none" />
          )
        }
        activeDot={false}
        isAnimationActive={!reducedMotion}
        animationDuration={1100}
        animationEasing="ease-out"
      >
        <LabelList
          dataKey="value"
          position="top"
          offset={12}
          fill="#58769D"
          fontSize={12}
          fontWeight={700}
        />
      </Area>
      {latest && (
        <ReferenceDot
          x={latest.date}
          y={latest.value}
          r={5.5}
          fill="#4C7EC8"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          shape={({ cx, cy }: { cx?: number; cy?: number }) => (
            <g transform={`translate(${(cx ?? 0) - 10}, ${(cy ?? 0) - 12})`} aria-label="최근 측정">
              <path
                d="M10 3.8C7.8 3.8 6.6 1.9 4.2 2.4C1.6 2.9 0.7 5.4 1.2 8.4C1.7 11.5 2.7 13.6 3.2 17.2C3.6 20.1 4.4 22 6 21.6C7.5 21.2 7.4 18.2 8.3 16.4C9.1 14.7 10.9 14.7 11.7 16.4C12.6 18.2 12.5 21.2 14 21.6C15.6 22 16.4 20.1 16.8 17.2C17.3 13.6 18.3 11.5 18.8 8.4C19.3 5.4 18.4 2.9 15.8 2.4C13.4 1.9 12.2 3.8 10 3.8Z"
                fill={`url(#${gradientId}-tooth)`}
                stroke="#5B86D6"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            </g>
          )}
        />
      )}
    </AreaChart>
  );
  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`${label}: ${data.map((point) => `${point.date} ${point.value}${unit}`).join(', ')}`}
      className="mt-3"
    >
      {!visible ? (
        <div style={{ height }} />
      ) : scrollable ? (
        <div className="overflow-x-auto pb-1">{chart}</div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
