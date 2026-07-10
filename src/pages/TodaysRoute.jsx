import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { uploadFile } from '@/api/uploadFile';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { todayCairo, nowCairo } from '@/lib/dateUtils';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Phone, Camera, MapPin, Truck, Navigation } from 'lucide-react';
import PropertyTypeBadge from '@/components/shared/PropertyTypeBadge';
import { isApartmentType } from '@/lib/propertyTypes';
import { useToast } from '@/components/ui/use-toast';

export default function TodaysRoute() {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pickups, setPickups] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failDialog, setFailDialog] = useState(null);
  const [failReason, setFailReason] = useState('');
  const [doneDialog, setDoneDialog] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const today = todayCairo();
    const allPickups = (await supabase.from('pickups').select('*').eq('date', today).order('sort_order', { ascending: true })).data;
    const buildingIds = [...new Set(allPickups.map(p => p.building_id))];
    let blds = [];
    if (buildingIds.length > 0) {
      blds = (await supabase.from('buildings').select('*')).data;
    }
    setPickups(allPickups);
    setBuildings(blds);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const buildingMap = {};
  buildings.forEach(b => { buildingMap[b.id] = b; });

  async function markDone(pickupId, photoFile) {
    setUploading(true);
    let photoUrl = '';
    if (photoFile) {
      const { file_url } = await uploadFile(photoFile );
      photoUrl = file_url;
    }
    await supabase.from('pickups').update({
      status: 'done',
      completion_photo: photoUrl,
      completion_timestamp: nowCairo().toISOString(),
    });
    setUploading(false);
    setDoneDialog(null);
    toast({ title: t('done') });
    load();
  }

  async function markFailed(pickupId) {
    if (!failReason.trim()) return;
    await supabase.from('pickups').update({
      status: 'failed',
      failure_reason: failReason,
    }).eq('id', pickupId);
    setFailDialog(null);
    setFailReason('');
    toast({ title: t('failed') });
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  const doneCount = pickups.filter(p => p.status === 'done').length;
  const pending = pickups.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-3 max-w-md mx-auto pb-6">
      {/* Route header */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-navy">{t('todays_route')}</h1>
          <span className="text-sm text-muted-foreground" dir="ltr">{todayCairo()}</span>
        </div>
        {user?.assigned_vehicle_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck size={16} />
            <span>{user.assigned_vehicle_name}</span>
          </div>
        )}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-navy" dir="ltr">{pickups.length}</p>
            <p className="text-xs text-muted-foreground">{t('total_stops')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green" dir="ltr">{doneCount}</p>
            <p className="text-xs text-muted-foreground">{t('done')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600" dir="ltr">{pending}</p>
            <p className="text-xs text-muted-foreground">{t('remaining')}</p>
          </div>
        </div>
      </div>

      {pickups.length === 0 && (
        <div className="bg-white rounded-2xl border p-10 text-center">
          <Truck size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-navy mb-1">{t('empty_stops_today')}</p>
          <p className="text-sm text-muted-foreground">{t('empty_stops_desc')}</p>
        </div>
      )}

      <div className="space-y-3">
        {pickups.map((p, i) => {
          const b = buildingMap[p.building_id];
          const isDone = p.status !== 'pending';
          const apt = isApartmentType(b?.property_type);
          const contactName = apt ? b?.bawab_name : b?.contact_person_name;
          const contactPhone = apt ? b?.bawab_phone : b?.contact_person_phone;
          return (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isDone ? 'opacity-50' : ''}`}>
              {/* Card header: number + status */}
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs font-bold text-navy bg-navy/10 px-2.5 py-0.5 rounded-full">{t('stop')} {i + 1} {t('of')} {pickups.length}</span>
                <StatusBadge status={p.status} />
              </div>

              {/* Building name - big */}
              <div className="px-4 pt-2 pb-1">
                <h3 className="text-2xl font-bold text-navy leading-tight">{p.building_name}</h3>
                {b && <div className="mt-1"><PropertyTypeBadge type={b.property_type} /></div>}
                {b?.address && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1 mt-1">
                    <MapPin size={14} className="mt-0.5 shrink-0" /> {b.address}
                  </p>
                )}
              </div>

              {/* Tap-to-call button - full width */}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center justify-center gap-2 mx-4 mt-3 mb-1 bg-cyan/10 text-cyan rounded-xl py-3 font-bold text-base active:bg-cyan/20 transition-colors"
                >
                  <Phone size={20} />
                  {contactName || t('call')}
                  <span dir="ltr" className="font-mono">{contactPhone}</span>
                </a>
              )}

              {/* Open in Maps */}
              {b?.gps_lat && b?.gps_lng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.gps_lat},${b.gps_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 mx-4 mt-2 mb-1 bg-navy/10 text-navy rounded-xl py-3 font-bold text-base active:bg-navy/20 transition-colors"
                >
                  <Navigation size={20} />
                  {t('open_in_maps')}
                </a>
              )}

              {/* Two big action buttons */}
              {p.status === 'pending' && (
                <div className="flex gap-2 p-3 pt-2">
                  <Button
                    onClick={() => setDoneDialog(p)}
                    className="flex-1 bg-green hover:bg-green/90 text-white text-lg font-bold py-7 rounded-xl h-auto"
                  >
                    <CheckCircle size={24} className="me-2" /> {t('mark_done')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setFailDialog(p); setFailReason(''); }}
                    className="flex-1 text-lg font-bold py-7 rounded-xl h-auto"
                  >
                    <XCircle size={24} className="me-2" /> {t('mark_failed')}
                  </Button>
                </div>
              )}

              {p.status === 'failed' && p.failure_reason && (
                <p className="text-sm text-red-500 px-4 pb-3 pt-1">{p.failure_reason}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Done dialog - camera/photo upload */}
      <Dialog open={!!doneDialog} onOpenChange={() => setDoneDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">{t('mark_done')} — {doneDialog?.building_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block w-full bg-green text-white rounded-xl py-6 text-center font-bold text-lg cursor-pointer hover:bg-green/90 transition-colors">
              <Camera size={28} className="inline-block me-2" />
              {t('completion_photo')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await markDone(doneDialog.id, file);
                }}
              />
            </label>
            <Button
              onClick={() => markDone(doneDialog.id, null)}
              disabled={uploading}
              variant="outline"
              className="w-full py-5 text-base font-bold"
            >
              {uploading ? '...' : t('skip')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fail dialog */}
      <Dialog open={!!failDialog} onOpenChange={() => setFailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">{t('mark_failed')} — {failDialog?.building_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={failReason}
              onChange={e => setFailReason(e.target.value)}
              rows={3}
              placeholder={t('failure_reason')}
              className="text-base"
              autoFocus
            />
            <Button
              onClick={() => markFailed(failDialog.id)}
              disabled={!failReason.trim()}
              variant="destructive"
              className="w-full py-6 text-lg font-bold"
            >
              {t('mark_failed')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}