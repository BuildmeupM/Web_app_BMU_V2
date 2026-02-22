/**
 * MessengerRoutes — shared constants and types
 */
import React from "react";
import { TbClock, TbCheck, TbX } from "react-icons/tb";

// Status config
export const statusConfig: Record<string, { label: string; color: string }> = {
  planned: { label: "วางแผน", color: "orange" },
  in_progress: { label: "กำลังดำเนินการ", color: "orange" },
  completed: { label: "เสร็จสิ้น", color: "green" },
};

export const stopStatusConfig: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  pending: { label: "รอดำเนินการ", color: "gray", icon: TbClock },
  completed: { label: "สำเร็จ", color: "green", icon: TbCheck },
  failed: { label: "ไม่สำเร็จ", color: "red", icon: TbX },
};

// Form stop type
export interface FormStop {
  location_name: string;
  location_id: string | null;
  tasks: string[];
  distance_km: number;
  estimated_time: string;
  notes: string;
  lat: number | null;
  lng: number | null;
}
