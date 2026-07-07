import React from 'react';
import { useLang } from '@/lib/i18n';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Stat, Empty } from '@/components/kpis/kpiWidgets';

const STATUS_META = [
  { key: 'trialing', labelKey: 'kpi_trialing', color: '#0891b2' },
  { key: 'active', labelKey: 'active', color: '#16a34a' },
  { key: 'paused', labelKey: 'paused', color: '#ea580c' },
  { key: 'cancelled', labelKey: 'cancelled', color: '#dc2626' },
];

export default function SubscriptionsSection({ subs }) {
  const { t } = useLang();
  const pieData = STATUS_META
    .map(s => ({ name: t(s.labelKey), key: s.key, value: subs.byStatus[s.key] || 0, color: s.color }))
    .filter(d => d.value);

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h2 className="font-semibold text-navy">{t('kpi_subscriptions')}</h2>
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label={t('kpi_active_subs')} value={subs.activeCount} />
        <Stat label={t('kpi_mrr')} value={Math.round(subs.mrr)} />
        <Stat label={t('kpi_conversion_rate')} value={`${subs.conversionRate}%`} sub={`${subs.converted}/${subs.trialsStarted}`} />
        <Stat label={t('kpi_churn')} value={subs.churn} />
      </div>
      {pieData.length > 0 ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty text={t('kpi_no_data')} />}
    </div>
  );
}