import React from 'react';
import { useLang } from '@/lib/i18n';
import { Table, Empty } from '@/components/kpis/kpiWidgets';

export default function SalesSection({ sales }) {
  const { t } = useLang();
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-5">
      <h2 className="font-semibold text-navy">{t('kpi_sales')}</h2>

      <div>
        <p className="text-xs font-semibold text-navy mb-2">{t('kpi_per_rep')}</p>
        <Table
          headers={[t('name'), t('kpi_signups'), t('kpi_conversions'), t('kpi_conversion_rate'), t('kpi_commissions_pending'), t('kpi_commissions_paid')]}
          rows={sales.repStats.map(r => [r.name, r.signups, r.conversions, `${r.conversionRate}%`, r.pending, r.paid])}
        />
        {sales.repStats.length === 0 && <Empty text={t('kpi_no_data')} />}
      </div>

      <div>
        <p className="text-xs font-semibold text-navy mb-2">{t('kpi_per_banger')}</p>
        <Table
          headers={[t('name'), t('kpi_deals_settled'), t('kpi_profit_generated'), t('kpi_pipeline_value')]}
          rows={sales.bangerStats.map(b => [b.name, b.settled, b.profit, b.pipeline])}
        />
        {sales.bangerStats.length === 0 && <Empty text={t('kpi_no_data')} />}
      </div>

      <div>
        <p className="text-xs font-semibold text-navy mb-2">
          {t('kpi_manager_overrides')} — <span dir="ltr">{Math.round(sales.managerTotal)}</span>
        </p>
        <Table headers={[t('name'), t('amount')]} rows={sales.byManager.map(m => [m.name, m.amount])} />
        {sales.byManager.length === 0 && <Empty text={t('kpi_no_data')} />}
      </div>
    </div>
  );
}