"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsApi, clipsApi, type Clip } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  discovered: "badge-blue",
  analyzing: "badge-yellow",
  ready: "badge-green",
  processing: "badge-yellow",
  qc: "badge-yellow",
  awaiting_approval: "badge-yellow",
  delivering: "badge-blue",
  completed: "badge-green",
  failed: "badge-red",
  paused: "badge-gray",
  expired: "badge-gray",
};

const CLIP_STATUS_COLORS: Record<string, string> = {
  generating: "badge-blue",
  editing: "badge-blue",
  qc_pending: "badge-yellow",
  qc_pass: "badge-green",
  qc_fail: "badge-red",
  awaiting_approval: "badge-yellow",
  approved: "badge-green",
  rejected_human: "badge-red",
  submitted: "badge-blue",
  accepted: "badge-green",
  rejected_platform: "badge-red",
};

function Stat({ label, value, color = "text-gray-100" }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: campaign,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignsApi.get(id),
    refetchInterval: 15000,
  });

  const { data: clips } = useQuery({
    queryKey: ["campaign-clips", id],
    queryFn: () => clipsApi.list({ campaign_id: id, page: 1 }),
    refetchInterval: 15000,
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["campaign", id] });
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const pause = useMutation({
    mutationFn: () => campaignsApi.pause(id),
    onSuccess: () => { toast.success("Campaign paused"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resume = useMutation({
    mutationFn: () => campaignsApi.resume(id),
    onSuccess: () => { toast.success("Campaign resumed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reprocess = useMutation({
    mutationFn: () => campaignsApi.reprocess(id),
    onSuccess: () => { toast.success("Reprocessing started"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => campaignsApi.delete(id),
    onSuccess: () => {
      toast.success("Campaign removed");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      router.push("/campaigns");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading campaign…</div>;
  }

  if (error || !campaign) {
    return (
      <div className="p-8">
        <Link href="/campaigns" className="btn-ghost inline-flex items-center gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </Link>
        <div className="card text-center text-gray-500 py-12">
          {error instanceof Error ? error.message : "Campaign not found"}
        </div>
      </div>
    );
  }

  const c = campaign;
  const isPausable = ["discovered", "analyzing", "ready", "processing", "qc", "awaiting_approval", "delivering"].includes(c.status);
  const isResumable = c.status === "paused";
  const requirementEntries = Object.entries(c.requirements ?? {});

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <Link href="/campaigns" className="btn-ghost inline-flex items-center gap-2 mb-4 -ml-3">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-100 truncate">{c.title}</h1>
              <span className={STATUS_COLORS[c.status] ?? "badge-gray"}>
                {c.status.replace(/_/g, " ")}
              </span>
            </div>
            {c.brand_name && <p className="text-sm text-gray-500 mt-1">{c.brand_name}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => refetch()} className="btn-ghost p-2" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            {isPausable && (
              <button onClick={() => pause.mutate()} disabled={pause.isPending} className="btn-ghost p-2" title="Pause">
                <Pause className="w-4 h-4" />
              </button>
            )}
            {isResumable && (
              <button onClick={() => resume.mutate()} disabled={resume.isPending} className="btn-ghost p-2" title="Resume">
                <Play className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => reprocess.mutate()} disabled={reprocess.isPending} className="btn-ghost p-2" title="Reprocess">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost p-2 text-red-400 hover:text-red-300"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {c.error_message && (
        <div className="card border-red-800/50 bg-red-900/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Last error</p>
            <p className="text-sm text-red-400/90 mt-1">{c.error_message}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <Stat label="Opportunity" value={`${((c.opportunity_score || 0) * 100).toFixed(0)}%`} color="text-brand-400" />
          <Stat label="Pay / clip" value={c.payment_per_accepted_clip ? `$${c.payment_per_accepted_clip}` : "—"} />
          <Stat label="Earnings" value={`$${(c.actual_earnings || 0).toFixed(2)}`} color="text-green-400" />
          <Stat label="Generated" value={c.clips_generated} />
          <Stat label="Accepted" value={c.clips_accepted} color="text-green-400" />
          <Stat label="Rejected" value={c.clips_rejected} color="text-red-400" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Requirements */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Requirements</h2>
          {requirementEntries.length > 0 ? (
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {requirementEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-800 pb-2">
                  <dt className="text-xs text-gray-500 capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="text-sm text-gray-300 text-right break-words">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No requirements recorded.</p>
          )}
        </div>

        {/* Meta */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-300">Details</h2>
          <div className="space-y-3 text-sm">
            {c.source_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Source</p>
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 break-all"
                >
                  {c.source_type || "Link"} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Due</p>
              <p className="text-gray-300">{c.due_at ? new Date(c.due_at).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-gray-300">{new Date(c.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Updated</p>
              <p className="text-gray-300">{new Date(c.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence notes */}
      {c.intelligence_notes && (
        <div className="card border-brand-500/20 bg-brand-500/5">
          <h2 className="text-sm font-semibold text-brand-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Campaign Intelligence
          </h2>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{c.intelligence_notes}</p>
        </div>
      )}

      {/* Clips */}
      <div>
        <h2 className="text-lg font-bold text-gray-100 mb-4">
          Clips {clips ? <span className="text-gray-500 font-normal text-sm">({clips.total})</span> : null}
        </h2>
        {!clips?.items.length ? (
          <div className="card text-center text-gray-500 py-12">No clips generated for this campaign yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clips.items.map((clip: Clip) => (
              <div key={clip.id} className="card flex flex-col gap-3">
                <div className="aspect-[9/16] bg-gray-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <span className="text-gray-600 text-xs">
                    {clip.width && clip.height ? `${clip.width}×${clip.height}` : "Video"}
                  </span>
                  <div className="absolute top-2 right-2">
                    <span className={CLIP_STATUS_COLORS[clip.status] ?? "badge-gray"}>
                      {clip.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        clip.overall_score >= 0.8 ? "bg-green-500" : clip.overall_score >= 0.6 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${clip.overall_score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{(clip.overall_score * 100).toFixed(0)}%</span>
                </div>
                {clip.hook_text && <p className="text-xs text-gray-400 italic">"{clip.hook_text}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDelete(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-100 mb-2">Delete campaign?</h2>
            <p className="text-sm text-gray-400 mb-5">
              This deactivates <span className="text-gray-200">{c.title}</span> and stops all processing. This cannot be undone from the dashboard.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost">Cancel</button>
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
