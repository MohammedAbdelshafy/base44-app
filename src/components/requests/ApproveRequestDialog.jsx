import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const WEEKDAYS_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function ApproveRequestDialog({ building, onClose, onApproved }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [frequency, setFrequency] = useState('daily');
  const [weekdays, setWeekdays] = useState([]);
  const [repCode, setRepCode] = useState('');
  const [createSub, setCreateSub] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (building) {
      setFrequency(building.collection_frequency || 'daily');
      setWeekdays(building.collection_weekdays || []);
      setRepCode(building.rep_code || '');
      setCreateSub(true);
      setMonthlyPrice(100);
    }
  }, [building]);

  function toggleWeekday(day) {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function handleApprove() {
    setSaving(true);
    try {
      await supabase.from('buildings').update({
        status: 'active',
        collection_frequency: frequency,
        collection_weekdays: weekdays,
        rep_code: repCode,
      }).eq('id', building.id);
      if (createSub) {
        const today = new Date().toISOString().split('T')[0];
        const trialEnd = new Date();
        trialEnd.setMonth(trialEnd.getMonth() + 1);
        await supabase.from('subscriptions').insert([{
          building_id: building.id,
          plan_name: 'Warraq Building Collection',
          status: 'trialing',
          monthly_price: Number(monthlyPrice) || 100,
          trial_start_date: today,
          trial_end_date: trialEnd.toISOString().split('T')[0],
        }]);
      }
      toast({ title: t('approved_success') });
      onApproved();
      onClose();
    } catch (err) {
      toast({ title: err.message || 'Error', variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <Dialog open={!!building} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t('approve')} — {building?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('collection_schedule')}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('daily')}</SelectItem>
                <SelectItem value="custom">{t('custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency === 'custom' && (
            <div>
              <Label>{t('weekdays')}</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {WEEKDAYS_KEYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={weekdays.includes(i)} onCheckedChange={() => toggleWeekday(i)} />
                    {t(d)}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>{t('rep_attribution')}</Label>
            <Input value={repCode} onChange={e => setRepCode(e.target.value)} placeholder={t('rep_code')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={createSub} onCheckedChange={setCreateSub} />
            {t('create_trial_subscription')}
          </label>
          {createSub && (
            <div>
              <Label>{t('monthly_price')}</Label>
              <Input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} dir="ltr" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={handleApprove} disabled={saving} className="bg-green hover:bg-green/90">{saving ? '...' : t('approve')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}