"use client";

import { useParams } from "next/navigation";
import TurnoverDetailContent from "./turnover-detail-content";

export default function TurnoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <TurnoverDetailContent id={id} />;
}
