import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { todayCairo } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import CustomerBuildingRegistration from '@/components/customer/CustomerBuildingRegistration';
import CustomerAwaitingApproval from '@/components/customer/CustomerAwaitingApproval';
import { Building2, MapPin, Phone, Navigation, Truck } from 'lucide-react';

const WHATSAPP = '201022795313';

export default function MyBuilding() {
  const { t } = useLang();
  const { user } = useAuth();
  const [building, setBuilding] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view');

  async function loadBuilding(buildingId) {
    const b = await base44.entities.Building.get(buildingId);
    setBuilding(b);
    return b;
  }

  useEffect(() => {
    (async () => {
      if (!user?.building_id) { setLoading(false); return; }
      try {
        await loadBuilding(user.building_id);
        const all = await base44.entities.Pickup.filter({ building_id: user.building_id }, 'date');
        setPickups(all);
      } catch (err) {}
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  // No building linked — empty state or registration form
  if (!building) {
    if (mode === 'register') {
      return (
        <div className="space-y-4">
          <PageHeader title={t('register_building')} />
          <CustomerBuildingRegistration
            user={user}
            onDone={async (buildingId) => {
              try { await loadBuilding(buildingId); } catch (e) {}
              setMode('view');
            }}
            onCancel={() => setMode('view')}
          />
        </div>
      );
    }
    return (
      <div className="max-w-md mx-auto">
        <PageHeader title={t('my_building')} />
        <div className="bg-white rounded-2xl border p-10 text-center">
          <Building2 size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-navy mb-1">{t('no_building_linked')}</p>
          <p className="text-sm text-muted-foreground mb-6">{t('no_building_linked_desc')}</p>
          <Button onClick={() => setMode('register')} className="bg-green hover:bg-green/90 text-white text-base font-bold h-14 px-8">
            {t('register_building')}
          </Button>
        </div>
      </div>
    );
  }

  // Awaiting approval or rejected
  if (building.status === 'pickup_requested' || building.status === 'rejected') {
    return (
      <div className="space-y-4">
        <PageHeader title={t('my_building')} />
        <CustomerAwaitingApproval building={building} onUpdated={async () => { try { await loadBuilding(building.id); } catch (e) {} }} />
      </div>
    );
  }

  // Active building — normal customer view
  const today = todayCairo();
  const upcoming = pickups.filter(p => p.date >= today && p.status === 'pending').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const nextPickup = upcoming[0];
  const history = pickups.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title={t('my_building')} />
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-navy">{building.name}</h2>
          <StatusBadge status={building.status || 'active'} />
        </div>
        {building.address && <p className="text-sm text-muted-foreground flex items-start gap-1"><MapPin size={14} className="mt-0.5" /> {building.address}</p>}
        {building.bawab_phone && (
          <a href={`tel:${building.bawab_phone}`} className="inline-flex items-center gap-1 text-cyan text-sm" dir="ltr"><Phone size={14} /> {building.bawab_phone}</a>
        )}
        {building.gps_lat && building.gps_lng && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${building.gps_lat},${building.gps_lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-navy/10 text-navy rounded-xl py-2.5 px-3 font-semibold text-sm w-fit">
            <Navigation size={16} /> {t('open_in_maps')}
          </a>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h3 className="font-semibold text-navy mb-2">{t('next_pickup')}</h3>
        {nextPickup ? (
          <p className="text-sm font-medium" dir="ltr">{nextPickup.date}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('no_pickups_scheduled')}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h3 className="font-semibold text-navy mb-3">{t('pickup_history')}</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('no_pickups_scheduled')}</p>
        ) : (
          <div className="space-y-3">
            {history.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 pb-3 border-b last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {p.completion_photo ? (
                    <img src={p.completion_photo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><Truck size={18} className="text-muted-foreground" /></div>
                  )}
                  <div>
                    <p className="text-sm font-medium" dir="ltr">{p.date}</p>
                    {p.failure_reason && <p className="text-xs text-red-500">{p.failure_reason}</p>}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-sm">
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
          {t('add_another_building')}
        </a>
      </p>
    </div>
  );
}