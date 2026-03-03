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
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#1A2029", border: "1px solid #2A3441", borderRadius: 8, color: "#E8ECF1" }}
        />
        <Legend
          formatter={(v) => <span className="text-xs text-text-muted">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
