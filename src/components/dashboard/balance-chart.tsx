"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BuildingView } from "@/types";
import { fmt$ } from "@/lib/utils";

interface Props {
  buildings: BuildingView[];
}

export default function BalanceChart({ buildings }: Props) {
  const data = buildings.map((b) => ({
    name: b.address.length > 20 ? b.address.slice(0, 20) + "..." : b.address,
    balance: b.totalBalance,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(250, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" tickFormatter={(v) => fmt$(v)} tick={{ fill: "#8899AA", fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fill: "#8899AA", fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => fmt$(v)}
          contentStyle={{ background: "#1A2029", border: "1px solid #2A3441", borderRadius: 8, color: "#E8ECF1" }}
        />
        <Bar dataKey="balance" fill="#3B82F6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
