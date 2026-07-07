import React from 'react';
import { useLang } from '@/lib/i18n';
import { CheckCircle, Banknote, Handshake, Percent } from 'lucide-react';

export default function KpiHeadlineCards({ activeSubs, mrr, cashCollected, dealProfit, conversionRate }) {
  const { t } = useLang();
  const cards = [
    { label: t('kpi_active_subs'), value: activeSubs, icon: CheckCircle, color: 'bg-green' },
    { label: t('kpi_mrr'), value: Math.round(mrr), icon: Banknote, color: 'bg-navy' },
    { label: t('kpi_cash_collected'), value: Math.round(cashCollected), icon: Banknote, color: 'bg-cyan' },
    { label: t('kpi_deal_profit'), value: Math.round(dealProfit), icon: Handshake, color: 'bg-green' },
    { label: t('kpi_conversion_rate'), value: `${conversionRate}%`, icon: Percent, color: 'bg-navy' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                <p className="text-2xl font-bold text-navy mt-1" dir="ltr">{c.value}</p>
              </div>
              <div className={`${c.color} p-2 rounded-lg`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}