import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { currentYM, buildLastMonths, computeGrowth, computeSubscriptions, computeRevenue, computeSales } from '@/lib/kpiUtils';
import PageHeader from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KpiHeadlineCards from '@/components/kpis/KpiHeadlineCards';
import GrowthSection from '@/components/kpis/GrowthSection';
import SubscriptionsSection from '@/components/kpis/SubscriptionsSection';
import RevenueSection from '@/components/kpis/RevenueSection';
import SalesSection from '@/components/kpis/SalesSection';

export default function Kpis() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(currentYM());

  useEffect(() => {
    Promise.all([
      base44.entities.Building.list('-created_date', 500),
      base44.entities.Subscription.list(),
      base44.entities.Payment.list('-created_date', 500),
      base44.entities.Deal.list('-created_date', 500),
      base44.entities.Commission.list('-created_date', 500),
      base44.entities.SalesMember.list(),
    ]).then(([buildings, subscriptions, payments, deals, commissions, salesMembers]) => {
      setData({ buildings, subscriptions, payments, deals, commissions, salesMembers });
    });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  const { buildings, subscriptions, payments, deals, commissions, salesMembers } = data;
  const growth = computeGrowth(buildings, month);
  const subs = computeSubscriptions(subscriptions, month);
  const rev = computeRevenue(payments, deals, month);
  const sales = computeSales(buildings, subscriptions, commissions, deals, salesMembers, month);
  const months = buildLastMonths(12);

  return (
    <div className="space-y-6">
      <PageHeader title={t('kpis')}>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.ym} value={m.ym}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <KpiHeadlineCards
        activeSubs={subs.activeCount}
        mrr={subs.mrr}
        cashCollected={rev.cashCollected}
        dealProfit={rev.dealProfit}
        conversionRate={subs.conversionRate}
      />

      <GrowthSection growth={growth} />
      <SubscriptionsSection subs={subs} />
      <RevenueSection rev={rev} />
      <SalesSection sales={sales} />
    </div>
  );
}