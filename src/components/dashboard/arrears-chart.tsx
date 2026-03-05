"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

interface Props {
  current: number;
  d30: number;
  d60: number;
  d90plus: number;
}

export default function ArrearsChart({ current, d30, d60, d90plus }: Props) {
  const data = [
    { name: "Current", value: Math.max(0, current) },
    { name: "30 Days", value: d30 },
    { name: "60 Days", value: d60 },
    { name: "90+ Days", value: d90plus },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="text-text-dim text-sm text-center py-8">No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <defs>
          {COLORS.map((color, i) => (
            <linearGradient key={i} id={`arrears-gradient-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          ))}
        </defs>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#arrears-gradient-${i})`} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "linear-gradient(135deg, #141A24, #1A2232)",
            border: "1px solid #2A3441",
            borderRadius: 12,
            color: "#E8ECF1",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        />
        <Legend
          formatter={(v) => <span className="text-xs text-text-muted">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
