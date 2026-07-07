import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { nowCairo } from '@/lib/dateUtils';
import { calcProfit, calcCommissions } from '@/lib/dealUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SettleDialog({ deal, bangers, onClose, onSettled }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (deal) {
      setForm({
        buy_total: deal.buy_total || 0,
        sell_total: deal.sell_total || 0,
        other_costs: deal.other_costs || 0,
        closer_id: deal.closer_id || deal.primary_banger_id || '',
        closer_name: deal.closer_name || deal.primary_banger_name || '',
      });
    }
  }, [deal]);

  const liveDeal = { ...deal, ...form };
  const profit = calcProfit(liveDeal);
  const { pool, closerKickback, entries } = calcCommissions(liveDeal);

  function setCloser(bangerId) {
    const b = bangers.find(sm => sm.id === bangerId);
    setForm(prev => ({ ...prev, closer_id: b?.id || '', closer_name: b?.name || '' }));
  }

  async function confirmSettle() {
    if (!form.closer_id || profit <= 0) return;
    setSettling(true);
    try {
      const now = nowCairo().toISOString();
      await base44.entities.Deal.update(deal.id, {
        status: 'settled',
        settled_at: now,
        buy_total: Number(form.buy_total) || 0,
        sell_total: Number(form.sell_total) || 0,
        other_costs: Number(form.other_costs) || 0,
        profit,
        closer_id: form.closer_id,
        closer_name: form.closer_name,
        confirmed_by_id: user?.id,
        confirmed_by_name: user?.full_name || user?.email || '',
      });

      // Create commissions only if profit > 0 (idempotency guard)
      const existing = await base44.entities.Commission.filter({ deal_id: deal.id });
      if (existing.length === 0 && entries.length > 0) {
        await base44.entities.Commission.bulkCreate(
          entries.map(e => ({ ...e, deal_id: deal.id, deal_title: deal.title, status: 'pending' }))
        );
      }

      toast({ title: t('settled') });
      onSettled();
      onClose();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    }
    setSettling(false);
  }

  function formatEgp(amount) {
    const whole = Math.round(amount || 0);
    if (lang === 'ar') {
      const arabicNumerals = whole.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
      return `${arabicNumerals} ج.م`;
    }
    return `${whole} EGP`;
  }

  return (
    <Dialog open={!!deal} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('confirm_settle')} — {deal?.title}</DialogTitle>
          <DialogDescription>{t('confirm_settle_desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Final numbers */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">{t('sell_total')}</Label>
              <Input type="number" value={form.sell_total || 0} onChange={e => setForm(p => ({ ...p, sell_total: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <Label className="text-xs">{t('buy_total')}</Label>
              <Input type="number" value={form.buy_total || 0} onChange={e => setForm(p => ({ ...p, buy_total: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <Label className="text-xs">{t('other_costs')}</Label>
              <Input type="number" value={form.other_costs || 0} onChange={e => setForm(p => ({ ...p, other_costs: e.target.value }))} dir="ltr" />
            </div>
          </div>

          {/* Profit */}
          <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
            <span className="font-semibold">{t('profit')}:</span>
            <span className={`text-2xl font-bold ${profit > 0 ? 'text-green' : 'text-red-500'}`} dir="ltr">
              {formatEgp(profit)}
            </span>
          </div>

          {profit <= 0 && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
              <AlertTriangle size={16} />
              {t('no_deals')}
            </div>
          )}

          {/* Closer */}
          <div>
            <Label className="text-xs">{t('closer')} *</Label>
            <Select value={form.closer_id || ''} onValueChange={setCloser}>
              <SelectTrigger><SelectValue placeholder={t('closer')} /></SelectTrigger>
              <SelectContent>
                {bangers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Commission breakdown */}
          {profit > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-navy text-sm">{t('who_earns_what')}</h4>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t('commission_pool')} (10%)</span>
                <span dir="ltr">{formatEgp(pool)}</span>
              </div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t('closer_kickback')} (1.5%)</span>
                <span dir="ltr">{formatEgp(closerKickback)}</span>
              </div>
              <div className="border-t pt-2 space-y-1.5">
                {entries.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-medium">{e.sales_member_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t(e.type)}</span>
                      <span className="font-bold text-green" dir="ltr">{formatEgp(e.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button
              onClick={confirmSettle}
              disabled={settling || !form.closer_id || profit <= 0}
              className="bg-green hover:bg-green/90"
            >
              {settling ? '...' : t('confirm_settle')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}