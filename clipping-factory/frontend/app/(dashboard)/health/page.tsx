"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { healthApi, type HealthStatus, type Job } from "@/lib/api";
import {
  Activity,
  Database,
  Server,
  HardDrive,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-block w-2 h-2 rounded-full mr-2",
        status === "up" || status === "healthy"
          ? "bg-green-500"
          : status === "degraded"
          ? "bg-yellow-500"
          : "bg-red-500"
      )}
    />
  );
}

function GaugeBar({ value, max = 100, color = "brand" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClass =
    pct > 85 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : `bg-${color}-500`;
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function HealthPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: () => healthApi.get(),
    refetchInterval: 15000,
  });

  const { data: queueData } = useQuery({
    queryKey: ["queues"],
    queryFn: () => healthApi.queueDepths(),
    refetchInterval: 10000,
  });

  const { data: jobsData } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => healthApi.jobs(),
    refetchInterval: 10000,
  });

  const statusColor = {
    healthy: "text-green-400",
    degraded: "text-yellow-400",
    critical: "text-red-400",
    unknown: "text-gray-400",
  }[data?.status ?? "unknown"];

  const StatusIcon = {
    healthy: CheckCircle2,
    degraded: AlertTriangle,
    critical: XCircle,
    unknown: Activity,
  }[data?.status ?? "unknown"];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">System Health</h1>
          {data?.ts && (
            <p className="text-xs text-gray-500 mt-1">
              Last checked: {new Date(data.ts).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Overall status */}
          <div className="card flex items-center gap-4">
            {StatusIcon && <StatusIcon className={`w-8 h-8 ${statusColor}`} />}
            <div>
              <p className="text-sm text-gray-400">System Status</p>
              <p className={`text-2xl font-bold capitalize ${statusColor}`}>
                {data?.status ?? "Unknown"}
              </p>
            </div>
          </div>

          {/* Services grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "postgres", label: "PostgreSQL", icon: Database },
              { key: "redis", label: "Redis", icon: Layers },
              { key: "minio", label: "Storage (MinIO)", icon: HardDrive },
            ].map(({ key, label, icon: Icon }) => {
              const status = (data?.services?.[key] as string) ?? "unknown";
              return (
                <div key={key} className="card">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">{label}</span>
                  </div>
                  <div className="flex items-center">
                    <StatusDot status={status} />
                    <span className="text-sm capitalize">{status}</span>
                  </div>
                </div>
              );
            })}

            {/* System resources */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <Cpu className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">CPU</span>
              </div>
              <p className="text-2xl font-bold text-gray-100 mb-1">
                {data?.cpu_percent?.toFixed(1) ?? "—"}%
              </p>
              {data?.cpu_percent != null && (
                <GaugeBar value={data.cpu_percent} />
              )}
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <Server className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Memory</span>
              </div>
              <p className="text-2xl font-bold text-gray-100 mb-1">
                {data?.memory_percent?.toFixed(1) ?? "—"}%
              </p>
              {data?.memory_percent != null && (
                <GaugeBar value={data.memory_percent} />
              )}
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Disk</span>
              </div>
              <p className="text-2xl font-bold text-gray-100 mb-1">
                {data?.disk_percent?.toFixed(1) ?? "—"}%
              </p>
              {data?.disk_percent != null && (
                <GaugeBar value={data.disk_percent} />
              )}
            </div>
          </div>

          {/* Queue depths */}
          {queueData && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Queue Depths
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(queueData).map(([queue, depth]) => (
                  <div key={queue}>
                    <p className="text-xs text-gray-500 capitalize">{queue}</p>
                    <p
                      className={clsx(
                        "text-lg font-bold",
                        depth > 20
                          ? "text-red-400"
                          : depth > 5
                          ? "text-yellow-400"
                          : "text-gray-100"
                      )}
                    >
                      {depth}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active alerts */}
          {data?.alerts && data.alerts.length > 0 && (
            <div className="card border-yellow-800/50 bg-yellow-900/10">
              <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Alerts ({data.alerts.length})
              </h2>
              <div className="space-y-2">
                {data.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "flex items-start gap-2 text-sm p-2 rounded",
                      a.level === "critical"
                        ? "bg-red-900/20 text-red-300"
                        : "bg-yellow-900/20 text-yellow-300"
                    )}
                  >
                    <span className="font-medium">[{a.service}]</span>
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent jobs */}
          {Array.isArray(jobsData) && jobsData.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">Recent Jobs</h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left px-6 py-2">Task</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Progress</th>
                    <th className="text-left px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {jobsData.slice(0, 15).map((j) => (
                    <tr key={j.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-2 text-gray-300 truncate max-w-xs">
                        {j.task?.split(".").pop()}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={clsx(
                            "badge",
                            j.status === "success"
                              ? "badge-green"
                              : j.status === "failed"
                              ? "badge-red"
                              : j.status === "running"
                              ? "badge-blue"
                              : "badge-gray"
                          )}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">{j.progress}%</td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(j.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
