import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
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
import { Plus, Edit2, Car } from 'lucide-react';

export default function Vehicles() {
  const { t } = useLang();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState({ name: '', plate_number: '', vehicle_type: 'tuk-tuk', is_active: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (data) setVehicles(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openForm(vehicle) {
    if (vehicle) {
      setEditVehicle(vehicle);
      setForm({ name: vehicle.name, plate_number: vehicle.plate_number, vehicle_type: vehicle.vehicle_type, is_active: vehicle.is_active });
    } else {
      setEditVehicle(null);
      setForm({ name: '', plate_number: '', vehicle_type: 'tuk-tuk', is_active: true });
    }
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editVehicle) {
      await supabase.from('vehicles').update(form).eq('id', editVehicle.id);
    } else {
      await supabase.from('vehicles').insert([form]);
    }
    setSaving(false);
    setFormOpen(false);
    load();
  }

  let filtered = vehicles;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(v => v.name?.toLowerCase().includes(q) || v.plate_number?.toLowerCase().includes(q));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('vehicles')}>
        <Button onClick={() => openForm(null)} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('add')}
        </Button>
      </PageHeader>

      <SearchFilter searchValue={search} onSearchChange={setSearch} />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-start p-3 font-semibold">{t('vehicles')}</th>
              <th className="text-start p-3 font-semibold">{t('plate_number')}</th>
              <th className="text-start p-3 font-semibold">{t('vehicle_type')}</th>
              <th className="text-start p-3 font-semibold">{t('is_active')}</th>
              <th className="text-start p-3 font-semibold hidden md:table-cell">{t('created_at')}</th>
              <th className="text-start p-3 font-semibold">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center">
                <Car size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-lg font-semibold text-navy mb-1">{t('empty_vehicles')}</p>
                <p className="text-sm text-muted-foreground mb-4">{t('empty_vehicles_desc')}</p>
                <Button onClick={() => openForm(null)} className="bg-navy hover:bg-navy/90">
                  <Plus size={16} className="me-1" /> {t('add')}
                </Button>
              </td></tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-muted/20">
                <td className="p-3 font-medium">{v.name}</td>
                <td className="p-3" dir="ltr">{v.plate_number}</td>
                <td className="p-3">{t(v.vehicle_type)}</td>
                <td className="p-3">{v.is_active ? '✓' : '✗'}</td>
                <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(v.created_at)}</td>
                <td className="p-3">
                  <Button variant="ghost" size="icon" onClick={() => openForm(v)}><Edit2 size={16} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVehicle ? t('edit') : t('add')} {t('vehicles')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('vehicles')} *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{t('plate_number')} *</Label><Input value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))} dir="ltr" /></div>
            <div>
              <Label>{t('vehicle_type')} *</Label>
              <Select value={form.vehicle_type} onValueChange={v => setForm(p => ({ ...p, vehicle_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['tuk-tuk', 'motorcycle-cart', 'vehicle_pickup'].map(vt => (
                    <SelectItem key={vt} value={vt}>{t(vt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>{t('is_active')}</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.plate_number} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}