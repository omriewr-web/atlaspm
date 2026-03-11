"use client";

import { use } from "react";
import TurnoverDetailContent from "./turnover-detail-content";

export default function TurnoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TurnoverDetailContent id={id} />;
}
