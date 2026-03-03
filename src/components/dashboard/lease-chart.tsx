"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6B7280"];

interface Props {
  active: number;
  expiringSoon: number;
  expired: number;
  noLease: number;
}

export default function LeaseChart({ active, expiringSoon, expired, noLease }: Props) {
  const data = [
    { name: "Active", value: Math.max(0, active) },
    { name: "Expiring Soon", value: expiringSoon },
    { name: "Expired", value: expired },
    { name: "No Lease", value: noLease },
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
        <Legend formatter={(v) => <span className="text-xs text-text-muted">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
