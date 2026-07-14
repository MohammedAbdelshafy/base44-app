"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type DashboardSummary, type RevenuePoint } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Video, DollarSign, Target } from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "brand",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <Icon className={`w-8 h-8 text-${color}-500 opacity-80`} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.summary(),
    refetchInterval: 30000,
  });

  const { data: revData = [] } = useQuery<RevenuePoint[]>({
    queryKey: ["analytics-revenue"],
    queryFn: () => analyticsApi.revenue(30),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading analytics...
      </div>
    );
  }

  const s = summary;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`$${(s?.revenue.total_usd ?? 0).toFixed(2)}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Acceptance Rate"
          value={`${s?.clips.acceptance_rate ?? 0}%`}
          sub={`${s?.clips.accepted ?? 0} of ${s?.clips.submitted ?? 0} submitted`}
          icon={Target}
          color="brand"
        />
        <StatCard
          label="Clips Generated"
          value={s?.clips.total ?? 0}
          sub={`${s?.clips.submitted ?? 0} submitted`}
          icon={Video}
          color="blue"
        />
        <StatCard
          label="Active Campaigns"
          value={s?.campaigns.active ?? 0}
          sub={`${s?.campaigns.completed ?? 0} completed`}
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* Revenue chart */}
      {revData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-6">
            Revenue — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937" }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#4f46e5" }}
              />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Acceptance rate chart */}
      {revData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-6">
            Acceptance Rate — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={revData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937" }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, "Rate"]}
              />
              <Line
                type="monotone"
                dataKey="acceptance_rate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign breakdown */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Campaign Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Active", value: s?.campaigns.active, color: "text-blue-400" },
            { label: "Completed", value: s?.campaigns.completed, color: "text-green-400" },
            { label: "Failed", value: s?.campaigns.failed, color: "text-red-400" },
            { label: "Total", value: s?.campaigns.total, color: "text-gray-100" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value ?? 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
