import React from 'react';
import { useLang } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

const statusStyles = {
  trialing: 'bg-cyan/15 text-cyan border-cyan/30',
  active: 'bg-green/15 text-green border-green/30',
  paused: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  cancelled: 'bg-red-500/15 text-red-500 border-red-500/30',
  pickup_requested: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
  lead: 'bg-gray-100 text-gray-600 border-gray-300',
  negotiating: 'bg-cyan/15 text-cyan border-cyan/30',
  agreed: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  in_delivery: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  settled: 'bg-green/15 text-green border-green/30',
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  done: 'bg-green/15 text-green border-green/30',
  failed: 'bg-red-500/15 text-red-500 border-red-500/30',
  paid: 'bg-green/15 text-green border-green/30',
};

export default function StatusBadge({ status }) {
  const { t } = useLang();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {t(status)}
    </span>
  );
}