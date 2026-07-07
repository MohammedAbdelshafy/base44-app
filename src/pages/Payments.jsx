import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { todayCairo, formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Payments() {
  const { t } = useLang();
  const { user } = useAuth();
  const role = user?.role;
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [salesMembers, setSalesMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ building_id: '', amount: 100, payment_date: todayCairo(), note: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, b, s, sm] = await Promise.all([
      base44.entities.Payment.list('-created_date'),
      base44.entities.Building.list(),
      base44.entities.Subscription.list(),
      base44.entities.SalesMember.list(),
    ]);
    setPayments(p);
    setBuildings(b);
    setSubscriptions(s);
    setSalesMembers(sm);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    const building = buildings.find(b => b.id === form.building_id);
    const amount = Number(form.amount);
    const payment = await base44.entities.Payment.create({
      building_id: form.building_id,
      building_name: building?.name || '',
      amount,
      payment_date: form.payment_date,
      collected_by_id: user?.id,
      collected_by_name: user?.full_name || user?.email || '',
      note: form.note,
    });

    const sub = subscriptions.find(s => s.building_id === form.building_id);

    // 1+2: Convert trialing subscription to active on first qualifying payment
    if (sub && sub.status === 'trialing' && amount >= 100) {
      await base44.entities.Subscription.update(sub.id, {
        status: 'active',
        converted_at: form.payment_date,
      });

      // 3: Rep bounty — only on this first conversion, never again
      if (building?.rep_code) {
        const rep = salesMembers.find(sm => sm.rep_code === building.rep_code && sm.member_role === 'rep');
        if (rep) {
          const existingBounty = await base44.entities.Commission.filter({
            payment_id: payment.id, type: 'rep_bounty',
          });
          if (existingBounty.length === 0) {
            await base44.entities.Commission.create({
              sales_member_id: rep.id,
              sales_member_name: rep.name,
              type: 'rep_bounty',
              amount: 10,
              building_id: building.id,
              building_name: building.name,
              payment_id: payment.id,
              rep_code: building.rep_code,
              status: 'pending',
            });
          }
        }
      }
    }

    // 4: Manager override — 5% on every payment, regardless of subscription status
    const manager = salesMembers.find(sm => sm.member_role === 'manager' && sm.is_active);
    if (manager) {
      const existingOverride = await base44.entities.Commission.filter({
        payment_id: payment.id, type: 'manager_override',
      });
      if (existingOverride.length === 0) {
        await base44.entities.Commission.create({
          sales_member_id: manager.id,
          sales_member_name: manager.name,
          type: 'manager_override',
          amount: amount * 0.05,
          building_id: form.building_id,
          building_name: building?.name || '',
          payment_id: payment.id,
          status: 'pending',
        });
      }
    }

    setSaving(false);
    setFormOpen(false);
    setForm({ building_id: '', amount: 100, payment_date: todayCairo(), note: '' });
    toast({ title: t('payment_recorded') });
    load();
  }

  async function handleDelete(id) {
    await base44.entities.Payment.delete(id);
    toast({ title: t('delete') });
    load();
  }

  let filtered = payments;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.building_name?.toLowerCase().includes(q) || p.collected_by_name?.toLowerCase().includes(q));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  const total = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader title={t('payments')}>
        <Button onClick={() => setFormOpen(true)} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('add_payment')}
        </Button>
      </PageHeader>

      <SearchFilter searchValue={search} onSearchChange={setSearch} />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-start p-3 font-semibold">{t('building_name')}</th>
                <th className="text-start p-3 font-semibold">{t('amount')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('payment_date')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('collected_by')}</th>
                <th className="text-start p-3 font-semibold hidden lg:table-cell">{t('note')}</th>
                <th className="text-start p-3 font-semibold hidden lg:table-cell">{t('created_at')}</th>
                {role === 'admin' && <th className="text-start p-3 font-semibold">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={role === 'admin' ? 7 : 6} className="p-12 text-center">
                  <CreditCard size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_payments')}</p>
                  <p className="text-sm text-muted-foreground mb-4">{t('empty_payments_desc')}</p>
                  <Button onClick={() => setFormOpen(true)} className="bg-navy hover:bg-navy/90">
                    <Plus size={16} className="me-1" /> {t('add_payment')}
                  </Button>
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="p-3 font-medium">{p.building_name}</td>
                  <td className="p-3 font-semibold text-green" dir="ltr">{p.amount} {t('egp')}</td>
                  <td className="p-3 hidden sm:table-cell">{p.payment_date}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{p.collected_by_name || '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{p.note || '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDateTime(p.created_date)}</td>
                  {role === 'admin' && (
                    <td className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td className="p-3 font-bold">{t('total')}</td>
                  <td className="p-3 font-bold text-green" dir="ltr">{total} {t('egp')}</td>
                  <td colSpan={role === 'admin' ? 5 : 4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_payment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('building_name')} *</Label>
              <Select value={form.building_id} onValueChange={v => setForm(prev => ({ ...prev, building_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t('building_name')} /></SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('amount')} ({t('egp')}) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div>
              <Label>{t('payment_date')} *</Label>
              <Input type="date" value={form.payment_date} onChange={e => setForm(prev => ({ ...prev, payment_date: e.target.value }))} />
            </div>
            <div>
              <Label>{t('note')}</Label>
              <Textarea value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.building_id} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}