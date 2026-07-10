import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { todayCairo, formatDateTime, formatDate, nowCairo } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, UserPlus, Truck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export default function Pickups() {
  const { t } = useLang();
  const { user } = useAuth();
  const role = user?.role;
  const isDataManager = role === 'data_manager';
  const { toast } = useToast();
  const [pickups, setPickups] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(todayCairo());
  const [generating, setGenerating] = useState(false);
  const [assignDialog, setAssignDialog] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');

  async function load() {
    const [p, b, u] = await Promise.all([
      base44.entities.Pickup.filter({ date: dateFilter }, '-sort_order'),
      base44.entities.Building.list(),
      base44.entities.User.list(),
    ]);
    setPickups(p);
    setBuildings(b);
    setUsers(u);
    setLoading(false);
  }

  useEffect(() => { load(); }, [dateFilter]);

  const drivers = users.filter(u => u.role === 'driver');

  async function generateTodaysPickups() {
    setGenerating(true);
    const today = todayCairo();
    const dayOfWeek = new Date(today).getDay();
    const existingBuildingIds = pickups.filter(p => p.date === today).map(p => p.building_id);

    const toCreate = buildings.filter(b => {
      if (existingBuildingIds.includes(b.id)) return false;
      if (b.status && b.status !== 'active') return false;
      if (b.collection_frequency === 'daily') return true;
      if (b.collection_frequency === 'custom' && b.collection_weekdays?.includes(dayOfWeek)) return true;
      return false;
    });

    if (toCreate.length > 0) {
      await supabase.from('pickups').insert(
        toCreate.map((b, i) => ({
          building_id: b.id,
          building_name: b.name,
          date: today,
          status: 'pending',
          sort_order: i,
        }))
      );
    }
    toast({ title: `${toCreate.length} pickups generated` });
    await load();
    setGenerating(false);
  }

  async function assignDriver(pickupId) {
    if (!selectedDriver) return;
    const driverUser = drivers.find(d => d.id === selectedDriver);
    await supabase.from('pickups').update({
      assigned_driver_id: selectedDriver,
      assigned_driver_name: driverUser?.full_name || '',
    }).eq('id', pickupId);
    setAssignDialog(null);
    setSelectedDriver('');
    load();
  }

  let filtered = pickups;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.building_name?.toLowerCase().includes(q) || p.assigned_driver_name?.toLowerCase().includes(q));
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(p => p.status === statusFilter);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('pickups')}>
        {!isDataManager && (
          <Button onClick={generateTodaysPickups} disabled={generating} className="bg-green hover:bg-green/90">
            <Zap size={16} className="me-1" /> {t('generate_pickups')}
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full sm:w-44" />
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: 'pending', label: t('pending') },
            { value: 'done', label: t('done') },
            { value: 'failed', label: t('failed') },
          ]}
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-start p-3 font-semibold">#</th>
                <th className="text-start p-3 font-semibold">{t('building_name')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('assigned_driver')}</th>
                <th className="text-start p-3 font-semibold">{t('status')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('created_at')}</th>
                {!isDataManager && <th className="text-start p-3 font-semibold">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={isDataManager ? 5 : 6} className="p-12 text-center">
                  <Truck size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_pickups')}</p>
                  <p className="text-sm text-muted-foreground">{t('empty_pickups_desc')}</p>
                </td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">{p.building_name}</td>
                  <td className="p-3 hidden sm:table-cell">{p.assigned_driver_name || '—'}</td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(p.created_at)}</td>
                  {!isDataManager && (
                    <td className="p-3">
                      <Button variant="outline" size="sm" onClick={() => { setAssignDialog(p); setSelectedDriver(p.assigned_driver_id || ''); }}>
                        <UserPlus size={14} className="me-1" /> {t('assign_driver')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign driver dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('assign_driver')} — {assignDialog?.building_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger><SelectValue placeholder={t('assign_driver')} /></SelectTrigger>
              <SelectContent>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialog(null)}>{t('cancel')}</Button>
              <Button onClick={() => assignDriver(assignDialog.id)} className="bg-navy hover:bg-navy/90">{t('save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}