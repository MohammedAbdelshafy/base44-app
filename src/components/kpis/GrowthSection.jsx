import React from 'react';
import { useLang } from '@/lib/i18n';
import { PROPERTY_TYPES } from '@/lib/propertyTypes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Stat, Empty } from '@/components/kpis/kpiWidgets';

export default function GrowthSection({ growth }) {
  const { t } = useLang();
  const typeRows = PROPERTY_TYPES
    .map(pt => ({ label: t(pt.labelKey), value: growth.byType[pt.value] || 0 }))
    .filter(r => r.value);

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h2 className="font-semibold text-navy">{t('kpi_growth')}</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label={t('kpi_new_properties')} value={growth.monthCount} />
        <Stat label={t('kpi_pending_pickup_requests')} value={growth.pendingRequests} />
        <Stat label={t('kpi_approval_rate')} value={`${growth.approvalRate}%`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t('kpi_new_properties')} — {t('kpi_per_week')}</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growth.weekly}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="staff" name={t('kpi_source_staff')} stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} />
              <Bar dataKey="self" name={t('kpi_source_self')} stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Breakdown title={t('kpi_by_source')} rows={[
          { label: t('kpi_source_staff'), value: growth.bySource.staff },
          { label: t('kpi_source_self'), value: growth.bySource.self },
        ]} />
        <Breakdown title={t('kpi_by_type')} rows={typeRows} emptyText={t('kpi_no_data')} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows, emptyText }) {
  return (
    <div>
      <p className="text-xs font-semibold text-navy mb-1">{title}</p>
      <div className="space-y-1">
        {rows.length === 0 ? (
          <Empty text={emptyText} />
        ) : rows.map((r, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium" dir="ltr">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}