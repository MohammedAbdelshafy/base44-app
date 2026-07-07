import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { nowCairo } from '@/lib/dateUtils';
import { calcProfit, MATERIALS, UNITS } from '@/lib/dealUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DealForm({ open, onClose, deal, bangers, onSaved }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      if (deal) {
        setForm({ ...deal });
      } else {
        setForm({
          title: '', material: '', quantity: '', unit: 'kg',
          seller_factory_name: '', seller_contact_person: '', seller_phone: '', seller_city: '',
          buyer_factory_name: '', buyer_contact_person: '', buyer_phone: '', buyer_city: '',
          buy_total: '', sell_total: '', other_costs: 0, other_costs_notes: '',
          primary_banger_id: '', primary_banger_name: '',
          referrer_id: '', referrer_name: '',
          closer_id: '', closer_name: '',
          referral_split_percent: 50,
          notes: '', attachments: [],
        });
      }
    }
  }, [open, deal]);

  const profit = calcProfit({
    ...form,
    buy_total: Number(form.buy_total) || 0,
    sell_total: Number(form.sell_total) || 0,
    other_costs: Number(form.other_costs) || 0,
  });

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setBanger(field, bangerId) {
    const b = bangers.find(sm => sm.id === bangerId);
    setForm(prev => ({
      ...prev,
      [`${field}_id`]: b?.id || '',
      [`${field}_name`]: b?.name || '',
    }));
  }

  async function uploadAttachment(file) {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), file_url] }));
    setUploading(false);
  }

  function removeAttachment(idx) {
    setForm(prev => ({ ...prev, attachments: (prev.attachments || []).filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!form.title || !form.material || !form.primary_banger_id) return;
    setSaving(true);
    const data = {
      ...form,
      quantity: form.quantity ? Number(form.quantity) : null,
      buy_total: Number(form.buy_total) || 0,
      sell_total: Number(form.sell_total) || 0,
      other_costs: Number(form.other_costs) || 0,
      profit,
      referral_split_percent: Number(form.referral_split_percent) || 50,
    };
    try {
      if (!deal) {
        data.lead_date = nowCairo().toISOString();
        data.status = 'lead';
        await base44.entities.Deal.create(data);
      } else {
        await base44.entities.Deal.update(deal.id, data);
      }
      toast({ title: t('save') });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? t('edit_deal') : t('add_deal')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Deal Info */}
          <section className="space-y-3">
            <h4 className="font-semibold text-navy text-sm">{t('deal_title')}</h4>
            <Input value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder={t('deal_title')} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('material')}</Label>
                <Select value={form.material} onValueChange={v => setField('material', v)}>
                  <SelectTrigger><SelectValue placeholder={t('material')} /></SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map(m => <SelectItem key={m} value={m}>{t(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t('quantity')}</Label>
                  <Input type="number" value={form.quantity || ''} onChange={e => setField('quantity', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t('unit')}</Label>
                  <Select value={form.unit} onValueChange={v => setField('unit', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{t(u)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* Seller & Buyer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="space-y-2">
              <h4 className="font-semibold text-navy text-sm">{t('seller')}</h4>
              <Input value={form.seller_factory_name || ''} onChange={e => setField('seller_factory_name', e.target.value)} placeholder={t('factory_name')} />
              <Input value={form.seller_contact_person || ''} onChange={e => setField('seller_contact_person', e.target.value)} placeholder={t('contact_person')} />
              <Input value={form.seller_phone || ''} onChange={e => setField('seller_phone', e.target.value)} placeholder={t('phone')} dir="ltr" />
              <Input value={form.seller_city || ''} onChange={e => setField('seller_city', e.target.value)} placeholder={t('city')} />
            </section>
            <section className="space-y-2">
              <h4 className="font-semibold text-navy text-sm">{t('buyer')}</h4>
              <Input value={form.buyer_factory_name || ''} onChange={e => setField('buyer_factory_name', e.target.value)} placeholder={t('factory_name')} />
              <Input value={form.buyer_contact_person || ''} onChange={e => setField('buyer_contact_person', e.target.value)} placeholder={t('contact_person')} />
              <Input value={form.buyer_phone || ''} onChange={e => setField('buyer_phone', e.target.value)} placeholder={t('phone')} dir="ltr" />
              <Input value={form.buyer_city || ''} onChange={e => setField('buyer_city', e.target.value)} placeholder={t('city')} />
            </section>
          </div>

          {/* Money */}
          <section className="space-y-3">
            <h4 className="font-semibold text-navy text-sm">{t('profit')}</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{t('sell_total')} ({t('egp')})</Label>
                <Input type="number" value={form.sell_total || ''} onChange={e => setField('sell_total', e.target.value)} dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">{t('buy_total')} ({t('egp')})</Label>
                <Input type="number" value={form.buy_total || ''} onChange={e => setField('buy_total', e.target.value)} dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">{t('other_costs')} ({t('egp')})</Label>
                <Input type="number" value={form.other_costs || 0} onChange={e => setField('other_costs', e.target.value)} dir="ltr" />
              </div>
            </div>
            <Input value={form.other_costs_notes || ''} onChange={e => setField('other_costs_notes', e.target.value)} placeholder={t('other_costs_notes')} />
            <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('profit')}:</span>
              <span className={`text-xl font-bold ${profit > 0 ? 'text-green' : 'text-red-500'}`} dir="ltr">
                {Math.round(profit)} {t('egp')}
              </span>
            </div>
          </section>

          {/* People */}
          <section className="space-y-3">
            <h4 className="font-semibold text-navy text-sm">{t('primary_banger')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('primary_banger')} *</Label>
                <Select value={form.primary_banger_id} onValueChange={v => setBanger('primary_banger', v)}>
                  <SelectTrigger><SelectValue placeholder={t('primary_banger')} /></SelectTrigger>
                  <SelectContent>
                    {bangers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('referrer')}</Label>
                <Select value={form.referrer_id || ''} onValueChange={v => setBanger('referrer', v)}>
                  <SelectTrigger><SelectValue placeholder={t('referrer')} /></SelectTrigger>
                  <SelectContent>
                    {bangers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('closer')}</Label>
                <Select value={form.closer_id || ''} onValueChange={v => setBanger('closer', v)}>
                  <SelectTrigger><SelectValue placeholder={t('closer')} /></SelectTrigger>
                  <SelectContent>
                    {bangers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.referrer_id && (
                <div>
                  <Label className="text-xs">{t('referral_split')}</Label>
                  <Input type="number" value={form.referral_split_percent || 50} onChange={e => setField('referral_split_percent', e.target.value)} dir="ltr" />
                </div>
              )}
            </div>
          </section>

          {/* Notes & Attachments */}
          <section className="space-y-3">
            <h4 className="font-semibold text-navy text-sm">{t('notes')}</h4>
            <Textarea value={form.notes || ''} onChange={e => setField('notes', e.target.value)} rows={2} placeholder={t('activity_log')} />
            <div>
              <Label className="text-xs">{t('attachments')}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(form.attachments || []).map((url, i) => (
                  <div key={i} className="relative">
                    {url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg border text-xs">📄</div>
                    )}
                    <button onClick={() => removeAttachment(i)} className="absolute -top-1 -end-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30">
                  <Upload size={18} className="text-muted-foreground" />
                  <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); }} />
                </label>
              </div>
              {uploading && <p className="text-xs text-muted-foreground mt-1">...</p>}
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={save} disabled={saving || !form.title || !form.material || !form.primary_banger_id} className="bg-navy hover:bg-navy/90">
              {saving ? '...' : t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}