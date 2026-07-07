import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, UserCog } from 'lucide-react';

export default function SalesMembers() {
  const { t } = useLang();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', member_role: 'rep', rep_code: '', is_active: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    const m = await base44.entities.SalesMember.list('-created_date');
    setMembers(m);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openForm(member) {
    if (member) {
      setEditMember(member);
      setForm({ name: member.name, phone: member.phone || '', member_role: member.member_role, rep_code: member.rep_code || '', is_active: member.is_active });
    } else {
      setEditMember(null);
      setForm({ name: '', phone: '', member_role: 'rep', rep_code: '', is_active: true });
    }
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editMember) {
      await base44.entities.SalesMember.update(editMember.id, form);
    } else {
      await base44.entities.SalesMember.create(form);
    }
    setSaving(false);
    setFormOpen(false);
    load();
  }

  let filtered = members;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(m => m.name?.toLowerCase().includes(q) || m.rep_code?.toLowerCase().includes(q) || m.phone?.includes(q));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('sales_members')}>
        <Button onClick={() => openForm(null)} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('add_sales_member')}
        </Button>
      </PageHeader>

      <SearchFilter searchValue={search} onSearchChange={setSearch} />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-start p-3 font-semibold">{t('name')}</th>
              <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('phone_number')}</th>
              <th className="text-start p-3 font-semibold">{t('member_role')}</th>
              <th className="text-start p-3 font-semibold">{t('rep_code')}</th>
              <th className="text-start p-3 font-semibold">{t('is_active')}</th>
              <th className="text-start p-3 font-semibold hidden md:table-cell">{t('created_at')}</th>
              <th className="text-start p-3 font-semibold">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center">
                <UserCog size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-lg font-semibold text-navy mb-1">{t('empty_sales_members')}</p>
                <p className="text-sm text-muted-foreground mb-4">{t('empty_sales_members_desc')}</p>
                <Button onClick={() => openForm(null)} className="bg-navy hover:bg-navy/90">
                  <Plus size={16} className="me-1" /> {t('add_sales_member')}
                </Button>
              </td></tr>
            )}
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-muted/20">
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3 hidden sm:table-cell" dir="ltr">{m.phone || '—'}</td>
                <td className="p-3">{t(m.member_role)}</td>
                <td className="p-3 font-mono">{m.rep_code || '—'}</td>
                <td className="p-3">{m.is_active ? '✓' : '✗'}</td>
                <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(m.created_date)}</td>
                <td className="p-3">
                  <Button variant="ghost" size="icon" onClick={() => openForm(m)}><Edit2 size={16} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMember ? t('edit') : t('add_sales_member')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('name')} *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{t('phone_number')}</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" /></div>
            <div>
              <Label>{t('member_role')} *</Label>
              <Select value={form.member_role} onValueChange={v => setForm(p => ({ ...p, member_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rep">{t('rep')}</SelectItem>
                  <SelectItem value="manager">{t('manager')}</SelectItem>
                  <SelectItem value="banger">{t('banger')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.member_role === 'rep' || form.member_role === 'banger') && (
              <div><Label>{t('rep_code')}</Label><Input value={form.rep_code} onChange={e => setForm(p => ({ ...p, rep_code: e.target.value }))} /></div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>{t('is_active')}</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.name} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}