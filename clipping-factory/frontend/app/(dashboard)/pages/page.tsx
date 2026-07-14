"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pagesApi, type Page } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pause, Play, Trash2, ScanLine } from "lucide-react";

function AddPageModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => pagesApi.create({ name, email }),
    onSuccess: () => {
      toast.success("Page added");
      qc.invalidateQueries({ queryKey: ["pages"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-100 mb-4">Add Page</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Page name (e.g. Travel Creator)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          />
          <input
            type="email"
            placeholder="Clipping.com email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => create.mutate()}
            disabled={!name || !email || create.isPending}
            className="btn-primary"
          >
            Add Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PagesPage() {
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => pagesApi.list(),
    refetchInterval: 30000,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Page> }) =>
      pagesApi.update(id, data),
    onSuccess: () => {
      toast.success("Page updated");
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => pagesApi.delete(id),
    onSuccess: () => {
      toast.success("Page removed");
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scan = useMutation({
    mutationFn: (id: string) => pagesApi.scan(id),
    onSuccess: () => toast.success("Scan started"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Pages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Clipping.com accounts
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Page
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages?.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.email}</p>
                </div>
                <span className={p.is_active && !p.is_paused ? "badge-green" : "badge-gray"}>
                  {p.is_paused ? "Paused" : p.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-lg font-bold text-gray-100">{p.campaigns_completed}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Earnings</p>
                  <p className="text-lg font-bold text-green-400">
                    ${(p.total_earnings_usd || 0).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Accept Rate</p>
                  <p className="text-lg font-bold text-gray-100">
                    {(p.acceptance_rate || 0).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => scan.mutate(p.id)}
                  className="btn-ghost flex-1 text-xs flex items-center justify-center gap-1"
                >
                  <ScanLine className="w-3 h-3" />
                  Scan
                </button>
                <button
                  onClick={() => update.mutate({ id: p.id, data: { is_paused: !p.is_paused } })}
                  className="btn-ghost flex-1 text-xs flex items-center justify-center gap-1"
                >
                  {p.is_paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  {p.is_paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => del.mutate(p.id)}
                  className="btn-ghost text-red-400 hover:text-red-300 px-3"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {!pages?.length && (
            <div className="col-span-full text-center text-gray-500 py-12">
              No pages yet. Add your first Clipping.com account.
            </div>
          )}
        </div>
      )}

      {showAdd && <AddPageModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
