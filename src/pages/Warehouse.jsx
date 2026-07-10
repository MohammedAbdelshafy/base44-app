import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { uploadFile } from '@/api/uploadFile';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { todayCairo, nowCairo, formatDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Warehouse() {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [dumps, setDumps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailDialog, setDetailDialog] = useState(null); // { vehicle, dumpId }
  const [detailForm, setDetailForm] = useState({ weight_kg: '', waste_type: '', photo: null });
  const [saving, setSaving] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState(todayCairo());

  async function load() {
    const [v, d] = await Promise.all([
      base44.entities.Vehicle.list(),
      base44.entities.Dump.list('-created_date', 200),
    ]);
    setVehicles(v);
    setDumps(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const today = todayCairo();
  const activeVehicles = vehicles.filter(v => v.is_active);

  function todayDumpsForVehicle(vehicleId) {
    return dumps.filter(d => d.vehicle_id === vehicleId && d.timestamp?.startsWith(today));
  }

  // One-tap dump: creates immediately, then opens optional detail dialog
  async function quickLogDump(vehicle) {
    const dump = await supabase.from('dumps').insert([{
      vehicle_id: vehicle.id,
      vehicle_name: vehicle.name,
      timestamp: nowCairo().toISOString(),
      logged_by_id: user?.id,
      logged_by_name: user?.full_name || user?.email || '',
      weight_kg: null,
      waste_type: null,
photo: null,
    }]);
    toast({ title: t('dump_recorded') });
    setDetailDialog({ vehicle, dumpId: dump.id });
    setDetailForm({ weight_kg: '', waste_type: '', photo: null });
    load();
  }

  async function saveDetails() {
    setSaving(true);
    const vehicle = detailDialog.vehicle;
    let photoUrl = '';
    if (detailForm.photo) {
      const { file_url } = await uploadFile(detailForm.photo );
      photoUrl = file_url;
    }
    await supabase.from('dumps').update({
      weight_kg: detailForm.weight_kg ? Number(detailForm.weight_kg).eq('id', detailDialog.dumpId) : null,
      waste_type: detailForm.waste_type || null,
      photo: photoUrl || null,
    });
    setSaving(false);
    setDetailDialog(null);
    toast({ title: t('save_details') });
    load();
  }

  // Daily summary
  const summaryDumps = dumps.filter(d => d.timestamp?.startsWith(summaryDate));
  const summaryByVehicle = {};
  summaryDumps.forEach(d => {
    if (!summaryByVehicle[d.vehicle_id]) {
      summaryByVehicle[d.vehicle_id] = { name: d.vehicle_name, count: 0, weight: 0 };
    }
    summaryByVehicle[d.vehicle_id].count++;
    summaryByVehicle[d.vehicle_id].weight += (d.weight_kg || 0);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-3 max-w-md mx-auto pb-6">
      {/* Compact header */}
      <h1 className="text-xl font-bold text-navy px-1">{t('warehouse')}</h1>

      {/* Vehicle cards */}
      {activeVehicles.length === 0 && (
        <div className="bg-white rounded-2xl border p-10 text-center">
          <Truck size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-navy mb-1">{t('empty_vehicles')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('empty_vehicles_desc')}</p>
        </div>
      )}

      <div className="space-y-3">
        {activeVehicles.map(v => {
          const todayCount = todayDumpsForVehicle(v.id).length;
          return (
            <div key={v.id} className="bg-white rounded-2xl border shadow-sm p-4">
              {/* Vehicle name + icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-navy/10 p-2.5 rounded-xl">
                  <Truck size={24} className="text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-navy text-lg leading-tight truncate">{v.name}</h3>
                  <p className="text-xs text-muted-foreground" dir="ltr">{v.plate_number} · {t(v.vehicle_type)}</p>
                </div>
              </div>

              {/* Today's count - huge */}
              <div className="text-center mb-3">
                <span className="text-5xl font-bold text-navy" dir="ltr">{todayCount}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{t('dump_count')} — {t('today')}</p>
              </div>

              {/* Giant log dump button */}
              <Button
                onClick={() => quickLogDump(v)}
                className="w-full bg-green hover:bg-green/90 text-white text-xl font-bold py-8 rounded-xl h-auto"
              >
                <Plus size={28} className="me-2" /> {t('log_dump')}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Daily summary - collapsible card list */}
      <button
        onClick={() => setSummaryOpen(!summaryOpen)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border shadow-sm px-4 py-3 mt-2"
      >
        <span className="font-bold text-navy">{t('daily_summary')}</span>
        {summaryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {summaryOpen && (
        <div className="space-y-2">
          <Input
            type="date"
            value={summaryDate}
            onChange={e => setSummaryDate(e.target.value)}
            className="w-full"
          />
          {Object.keys(summaryByVehicle).length === 0 && (
            <div className="bg-white rounded-2xl border p-6 text-center text-muted-foreground">
              {t('no_data')}
            </div>
          )}
          {Object.entries(summaryByVehicle).map(([id, v]) => (
            <div key={id} className="bg-white rounded-2xl border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy">{v.name}</span>
                <span className="text-2xl font-bold text-navy" dir="ltr">{v.count}</span>
              </div>
              {v.weight > 0 && (
                <p className="text-sm text-muted-foreground mt-1" dir="ltr">
                  {v.weight} {t('weight_kg').replace('(', '').replace(')', '')}
                </p>
              )}
            </div>
          ))}
          {Object.keys(summaryByVehicle).length > 0 && (
            <div className="bg-navy/5 rounded-2xl border border-navy/20 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy">{t('total')}</span>
                <span className="text-2xl font-bold text-navy" dir="ltr">{summaryDumps.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1" dir="ltr">
                {summaryDumps.reduce((s, d) => s + (d.weight_kg || 0), 0)} kg
              </p>
            </div>
          )}
        </div>
      )}

      {/* Optional detail dialog - can be skipped */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">{t('optional_details')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Select value={detailForm.waste_type} onValueChange={v => setDetailForm(prev => ({ ...prev, waste_type: v }))}>
                <SelectTrigger className="py-5 text-base"><SelectValue placeholder={t('waste_type')} /></SelectTrigger>
                <SelectContent>
                  {['mixed', 'organic', 'recyclable', 'cardboard', 'cooking_oil'].map(wt => (
                    <SelectItem key={wt} value={wt}>{t(wt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              value={detailForm.weight_kg}
              onChange={e => setDetailForm(prev => ({ ...prev, weight_kg: e.target.value }))}
              placeholder={t('weight_kg')}
              className="py-5 text-base"
            />
            <label className="block w-full border border-dashed rounded-xl py-5 text-center text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
              {detailForm.photo ? '✓ ' + t('photo') : t('photo')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => setDetailForm(prev => ({ ...prev, photo: e.target.files?.[0] || null }))}
              />
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDetailDialog(null)}
                className="flex-1 py-5 text-base font-bold"
              >
                {t('skip')}
              </Button>
              <Button
                onClick={saveDetails}
                disabled={saving}
                className="flex-1 bg-navy hover:bg-navy/90 py-5 text-base font-bold"
              >
                {saving ? '...' : t('save_details')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}