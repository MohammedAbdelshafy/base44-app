import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, Navigation, Inbox } from 'lucide-react';
import ApproveRequestDialog from '@/components/requests/ApproveRequestDialog';
import PropertyTypeBadge from '@/components/shared/PropertyTypeBadge';
import { PropertyTypeFilter } from '@/components/shared/PropertyTypeSelect';
import { isApartmentType } from '@/lib/propertyTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function NewRequests() {
  const { t } = useLang();
  const { toast } = useToast();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  async function load() {
    const all = await base44.entities.Building.list('-created_date');
    setBuildings(all.filter(b => b.status === 'pickup_requested'));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function confirmReject() {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      await base44.entities.Building.update(rejectTarget.id, { status: 'rejected', rejection_reason: rejectReason });
      setRejectTarget(null);
      setRejectReason('');
      toast({ title: t('rejected_success') });
      load();
    } catch (err) {
      toast({ title: err.message || 'Error', variant: 'destructive' });
    }
    setRejecting(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  const visible = typeFilter === 'all' ? buildings : buildings.filter(b => (b.property_type || 'apartment_building') === typeFilter);

  return (
    <div className="space-y-4">
      <PageHeader title={t('new_requests')} subtitle={t('no_new_requests_desc')}>
        <PropertyTypeFilter value={typeFilter} onChange={setTypeFilter} className="w-44" />
      </PageHeader>

      {visible.length === 0 && (
        <div className="bg-white rounded-2xl border p-10 text-center">
          <Inbox size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-navy mb-1">{t('no_new_requests')}</p>
          <p className="text-sm text-muted-foreground">{t('no_new_requests_desc')}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {visible.map(b => (
          <div key={b.id} className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-navy">{b.name}</h3>
                {b.address && <p className="text-sm text-muted-foreground flex items-start gap-1 mt-0.5"><MapPin size={14} className="mt-0.5 shrink-0" /> {b.address}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <PropertyTypeBadge type={b.property_type} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(b.created_date)}</span>
              </div>
            </div>

            <div className="text-sm space-y-1">
              {isApartmentType(b.property_type) ? (
                <>
                  <p><span className="text-muted-foreground">{t('bawab_name')}:</span> {b.bawab_name || '—'}</p>
                  {b.bawab_phone && (
                    <a href={`tel:${b.bawab_phone}`} className="inline-flex items-center gap-1 text-cyan font-medium" dir="ltr">
                      <Phone size={14} /> {b.bawab_phone}
                    </a>
                  )}
                </>
              ) : (
                <>
                  <p><span className="text-muted-foreground">{t('contact_person_name')}:</span> {b.contact_person_name || '—'}</p>
                  {b.contact_person_phone && (
                    <a href={`tel:${b.contact_person_phone}`} className="inline-flex items-center gap-1 text-cyan font-medium" dir="ltr">
                      <Phone size={14} /> {b.contact_person_phone}
                    </a>
                  )}
                </>
              )}
            </div>

            {b.gps_lat && b.gps_lng && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.gps_lat},${b.gps_lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-navy/10 text-navy rounded-xl py-2.5 font-semibold text-sm">
                <Navigation size={16} /> {t('open_in_maps')}
              </a>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={() => setApproveTarget(b)} className="flex-1 bg-green hover:bg-green/90">{t('approve')}</Button>
              <Button variant="destructive" onClick={() => { setRejectTarget(b); setRejectReason(''); }} className="flex-1">{t('reject')}</Button>
            </div>
          </div>
        ))}
      </div>

      <ApproveRequestDialog building={approveTarget} onClose={() => setApproveTarget(null)} onApproved={load} />

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('reject')} — {rejectTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder={t('rejection_reason')} autoFocus />
            <Button variant="destructive" onClick={confirmReject} disabled={!rejectReason.trim() || rejecting} className="w-full py-5 font-bold">
              {rejecting ? '...' : t('reject')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}