import React from 'react';
import { useLang } from '@/lib/i18n';
import { calcProfit, daysInStage, NEXT_STATUS } from '@/lib/dealUtils';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Edit2, X, ArrowRight } from 'lucide-react';

export default function DealCard({ deal, onEdit, onAdvance, onSettle, onCancel, canSettle }) {
  const { t, lang } = useLang();
  const profit = calcProfit(deal);
  const days = daysInStage(deal);
  const canAdvance = !!NEXT_STATUS[deal.status] && deal.status !== 'cancelled' && deal.status !== 'settled';
  const canCancel = deal.status !== 'settled' && deal.status !== 'cancelled';
  const showSettle = deal.status === 'in_delivery' && canSettle;

  function formatEgp(amount) {
    const whole = Math.round(amount || 0);
    if (lang === 'ar') {
      const arabicNumerals = whole.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
      return `${arabicNumerals} ج.م`;
    }
    return `${whole} EGP`;
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-navy text-lg leading-tight flex-1">{deal.title}</h3>
        <StatusBadge status={deal.status} />
      </div>

      <span className="inline-block text-xs font-semibold bg-cyan/15 text-cyan px-2 py-0.5 rounded-full mb-3 w-fit">
        {t(deal.material)}{deal.quantity ? ` · ${deal.quantity} ${t(deal.unit)}` : ''}
      </span>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-xs text-muted-foreground">{t('sell_total')}</p>
          <p className="font-semibold text-sm text-green" dir="ltr">{formatEgp(deal.sell_total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('buy_total')}</p>
          <p className="font-semibold text-sm text-red-500" dir="ltr">{formatEgp(deal.buy_total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('profit')}</p>
          <p className={`font-bold text-lg ${profit >= 0 ? 'text-green' : 'text-red-500'}`} dir="ltr">{formatEgp(profit)}</p>
        </div>
      </div>

      <div className="space-y-0.5 text-sm text-muted-foreground mb-3">
        <p>{t('primary_banger')}: <span className="font-medium text-foreground">{deal.primary_banger_name || '—'}</span></p>
        {deal.referrer_name && <p className="text-xs">{t('referrer')}: <span className="font-medium text-foreground">{deal.referrer_name}</span></p>}
        {deal.closer_name && <p className="text-xs">{t('closer')}: <span className="font-medium text-foreground">{deal.closer_name}</span></p>}
        <p className="text-xs">{t('days_in_stage')}: <span dir="ltr">{days}</span></p>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button variant="outline" size="sm" onClick={() => onEdit(deal)}>
          <Edit2 size={14} className="me-1" /> {t('edit')}
        </Button>
        {canAdvance && !showSettle && (
          <Button size="sm" onClick={() => onAdvance(deal)} className="bg-navy hover:bg-navy/90">
            {t(NEXT_STATUS[deal.status])} <ArrowRight size={14} className="ms-1" />
          </Button>
        )}
        {showSettle && (
          <Button size="sm" onClick={() => onSettle(deal)} className="bg-green hover:bg-green/90">
            {t('settle')}
          </Button>
        )}
        {canCancel && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(deal)} className="text-red-500 ms-auto">
            <X size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}