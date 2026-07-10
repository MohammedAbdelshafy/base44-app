import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { uploadFile } from '@/api/uploadFile';
import { useLang } from '@/lib/i18n';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Upload, ArrowRightLeft, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Drivers() {
  const { t } = useLang();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editDriver, setEditDriver] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [reassignSource, setReassignSource] = useState(null);
  const [targetDriver, setTargetDriver] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [u, v] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Vehicle.list(),
    ]);
    setDrivers(u.filter(u => u.role === 'driver'));
    setVehicles(v);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  let filtered = drivers;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d => d.full_name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q));
  }

  async function inviteDriver() {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      await supabase.functions.invoke('inviteUser', { body: { email: inviteEmail.trim(), role: 'driver' } });
      toast({ title: t('invite_driver') });
      setInviteOpen(false);
      setInviteEmail('');
      load();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  function openEdit(driver) {
    setEditDriver(driver);
    setEditForm({
      full_name: driver.full_name || '',
      phone: driver.phone || '',
      photo: driver.photo || '',
      assigned_vehicle_id: driver.assigned_vehicle_id || '',
      assigned_vehicle_name: driver.assigned_vehicle_name || '',
      is_active: driver.is_active !== false,
    });
  }

  async function uploadPhoto(file) {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditForm(prev => ({ ...prev, photo: file_url }));
    setUploading(false);
  }

  function setVehicle(vehicleId) {
    const v = vehicles.find(v => v.id === vehicleId);
    setEditForm(prev => ({ ...prev, assigned_vehicle_id: v?.id || '', assigned_vehicle_name: v?.name || '' }));
  }

  async function saveDriver() {
    setSaving(true);
    try {
      await supabase.from('users').update({
        full_name: editForm.full_name,
        phone: editForm.phone,
        photo: editForm.photo,
        assigned_vehicle_id: editForm.assigned_vehicle_id,
        assigned_vehicle_name: editForm.assigned_vehicle_name,
        is_active: editForm.is_active,
      }).eq('id', editDriver.id);
      toast({ title: t('save') });
      setEditDriver(null);
      load();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleReassign() {
    if (!reassignSource || !targetDriver) return;
    setSaving(true);
    try {
      const target = drivers.find(d => d.id === targetDriver);
      const pickups = (await supabase.from('pickups').select('*').match({ assigned_driver_id: reassignSource.id }).order('status', { ascending: true })).data;
      if (pickups.length > 0) {
        await supabase.from('pickups').update({ assigned_driver_id: targetDriver, assigned_driver_name: target?.full_name || '' }).in('id', 
          pickups.map(p => ({ id: p.id }))
        );
      }
      toast({ title: `${pickups.length} pickups reassigned` });
      setReassignSource(null);
      setTargetDriver('');
      load();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('drivers')}>
        <Button onClick={() => setInviteOpen(true)} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('add_driver')}
        </Button>
      </PageHeader>

      <SearchFilter searchValue={search} onSearchChange={setSearch} />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-start p-3 font-semibold">{t('username')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('email')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('phone')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('assigned_vehicle')}</th>
                <th className="text-start p-3 font-semibold">{t('is_active')}</th>
                <th className="text-start p-3 font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center">
                  <UserCheck size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_drivers')}</p>
                  <p className="text-sm text-muted-foreground mb-4">{t('empty_drivers_desc')}</p>
                  <Button onClick={() => setInviteOpen(true)} className="bg-navy hover:bg-navy/90">
                    <Plus size={16} className="me-1" /> {t('add_driver')}
                  </Button>
                </td></tr>
              )}
              {filtered.map(d => (
                <tr key={d.id} className={`hover:bg-muted/20 ${d.is_active === false ? 'opacity-50' : ''}`}>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {d.photo && <img src={d.photo} alt="" className="w-8 h-8 rounded-full object-cover" />}
                      {d.full_name || d.email}
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground" dir="ltr">{d.email}</td>
                  <td className="p-3 hidden sm:table-cell" dir="ltr">{d.phone || '—'}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{d.assigned_vehicle_name || '—'}</td>
                  <td className="p-3">{d.is_active !== false ? '✓' : '✗'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setReassignSource(d); setTargetDriver(''); }} title={t('reassign_pickups')}>
                        <ArrowRightLeft size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_driver')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('email')} *</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} dir="ltr" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('cancel')}</Button>
              <Button onClick={inviteDriver} disabled={saving || !inviteEmail} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('invite_driver')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit driver dialog */}
      <Dialog open={!!editDriver} onOpenChange={() => setEditDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_driver')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('username')}</Label>
              <Input value={editForm.full_name || ''} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>{t('phone')}</Label>
              <Input value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <Label>{t('assigned_vehicle')}</Label>
              <Select value={editForm.assigned_vehicle_id || ''} onValueChange={setVehicle}>
                <SelectTrigger><SelectValue placeholder={t('assigned_vehicle')} /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.is_active).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('photo')}</Label>
              <div className="flex items-center gap-3 mt-1">
                <label className="cursor-pointer bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary/80">
                  <Upload size={16} />
                  {uploading ? '...' : t('photo')}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
                </label>
                {editForm.photo && <img src={editForm.photo} alt="" className="h-12 w-12 rounded-full object-cover" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.is_active} onCheckedChange={v => setEditForm(p => ({ ...p, is_active: v }))} />
              <Label>{t('is_active')}</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDriver(null)}>{t('cancel')}</Button>
              <Button onClick={saveDriver} disabled={saving} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign pickups dialog */}
      <Dialog open={!!reassignSource} onOpenChange={() => setReassignSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reassign_pickups')} — {reassignSource?.full_name || reassignSource?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('reassign_pickups_desc')}</p>
            <Select value={targetDriver} onValueChange={setTargetDriver}>
              <SelectTrigger><SelectValue placeholder={t('target_driver')} /></SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.id !== reassignSource?.id && d.is_active !== false).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReassignSource(null)}>{t('cancel')}</Button>
              <Button onClick={handleReassign} disabled={saving || !targetDriver} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('reassign_pickups')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}