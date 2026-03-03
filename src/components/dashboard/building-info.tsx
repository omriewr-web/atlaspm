"use client";

import { Building2, Users, DoorOpen, DollarSign, Scale } from "lucide-react";
import { BuildingView } from "@/types";
import { fmt$, pct } from "@/lib/utils";

interface Props {
  building: BuildingView;
  onClose: () => void;
}

export default function BuildingInfo({ building, onClose }: Props) {
  const vacancyRate = building.totalUnits > 0
    ? (building.vacant / building.totalUnits) * 100
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-text-primary">{building.address}</h3>
        </div>
        <button onClick={onClose} className="text-text-dim hover:text-text-muted text-xs">
          Close
        </button>
      </div>

      {building.altAddress && (
        <p className="text-xs text-text-dim mb-3">{building.altAddress}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <InfoItem icon={Users} label="Total Units" value={String(building.totalUnits)} />
        <InfoItem icon={Users} label="Occupied" value={String(building.occupied)} color="text-green-400" />
        <InfoItem icon={DoorOpen} label="Vacant" value={String(building.vacant)} color="text-amber-400" />
        <InfoItem icon={DollarSign} label="Balance" value={fmt$(building.totalBalance)} color="text-red-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-text-dim">Vacancy Rate</span>
          <p className="text-text-primary font-medium">{pct(vacancyRate)}</p>
        </div>
        <div>
          <span className="text-text-dim">Market Rent</span>
          <p className="text-text-primary font-medium">{fmt$(building.totalMarketRent)}</p>
        </div>
        <div>
          <span className="text-text-dim">Legal Cases</span>
          <p className="text-text-primary font-medium flex items-center gap-1">
            <Scale className="w-3 h-3 text-purple-400" /> {building.legalCaseCount}
          </p>
        </div>
        <div>
          <span className="text-text-dim">Type</span>
          <p className="text-text-primary font-medium">{building.type}</p>
        </div>
      </div>

      {(building.entity || building.portfolio || building.region) && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3 text-xs">
          {building.entity && (
            <div>
              <span className="text-text-dim">Entity</span>
              <p className="text-text-primary">{building.entity}</p>
            </div>
          )}
          {building.portfolio && (
            <div>
              <span className="text-text-dim">Portfolio</span>
              <p className="text-text-primary">{building.portfolio}</p>
            </div>
          )}
          {building.region && (
            <div>
              <span className="text-text-dim">Region</span>
              <p className="text-text-primary">{building.region}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-text-dim" />
      <div>
        <p className="text-xs text-text-dim">{label}</p>
        <p className={`text-sm font-semibold ${color || "text-text-primary"}`}>{value}</p>
      </div>
    </div>
  );
}
