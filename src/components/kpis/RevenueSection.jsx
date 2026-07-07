import React from 'react';
import { useLang } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Stat } from '@/components/kpis/kpiWidgets';

export default function RevenueSection({ rev }) {
  const { t } = useLang();
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <h2 className="font-semibold text-navy">{t('kpi_revenue')}</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label={t('kpi_cash_collected')} value={Math.round(rev.cashCollected)} />
        <Stat label={t('kpi_deal_profit')} value={Math.round(rev.dealProfit)} />
        <Stat label={t('kpi_materials_sold')} value={Math.round(rev.materialsSoldValue)} sub={`${rev.settledCount}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t('kpi_total_revenue_6m')}</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rev.series}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="cash" name={t('kpi_cash_collected')} stackId="r" fill="#0891b2" radius={[0, 0, 0, 0]} />
              <Bar dataKey="profit" name={t('kpi_deal_profit')} stackId="r" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}