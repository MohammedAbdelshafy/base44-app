import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { todayCairo, formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle, Clock, Truck, Activity, Handshake, TrendingUp, Inbox, ChevronLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { PropertyTypeFilter } from '@/components/shared/PropertyTypeSelect';
import { getTypeColor, PROPERTY_TYPES } from '@/lib/propertyTypes';

function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function Dashboard() {
  const { t } = useLang();
  const [buildings, setBuildings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [dumps, setDumps] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deals, setDeals] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Building.list(),
      base44.entities.Subscription.list(),
      base44.entities.Pickup.filter({ date: todayCairo() }),
      base44.entities.Dump.list('-created_date', 50),
      base44.entities.Payment.list('-created_date', 10),
      base44.entities.Deal.list('-created_date', 200),
    ]).then(([b, s, p, d, pay, de]) => {
      setBuildings(b);
      setSubscriptions(s);
      setPickups(p);
      setDumps(d);
      setPayments(pay);
      setDeals(de);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  const todayStr = todayCairo();
  const todayDumps = dumps.filter(d => d.timestamp?.startsWith(todayStr));

  const visibleBuildings = typeFilter === 'all'
    ? buildings
    : buildings.filter(b => (b.property_type || 'apartment_building') === typeFilter);
  const visibleIds = new Set(visibleBuildings.map(b => b.id));
  const visibleSubs = subscriptions.filter(s => visibleIds.has(s.building_id));

  const activeSubs = visibleSubs.filter(s => s.status === 'active').length;
  const trialingSubs = visibleSubs.filter(s => s.status === 'trialing').length;
  const pickupsDone = pickups.filter(p => p.status === 'done').length;
  const pickupsPending = pickups.filter(p => p.status === 'pending').length;
  const pickupsFailed = pickups.filter(p => p.status === 'failed').length;

  const gpsBuildings = visibleBuildings.filter(b => b.gps_lat && b.gps_lng);
  const center = gpsBuildings.length > 0
    ? [gpsBuildings[0].gps_lat, gpsBuildings[0].gps_lng]
    : [30.09, 31.24]; // Warraq default

  const subStatusMap = {};
  visibleSubs.forEach(s => { subStatusMap[s.building_id] = s.status; });

  const activities = [
    ...visibleBuildings.slice(0, 5).map(b => ({ type: 'building', label: t('building_registered'), name: b.name, date: b.created_date })),
    ...pickups.filter(p => p.status === 'done').slice(0, 5).map(p => ({ type: 'pickup', label: t('pickup_completed'), name: p.building_name, date: p.completion_timestamp || p.created_date })),
    ...payments.slice(0, 5).map(p => ({ type: 'payment', label: t('payment_recorded'), name: p.building_name, date: p.created_date })),
    ...todayDumps.slice(0, 5).map(d => ({ type: 'dump', label: t('dump_logged'), name: d.vehicle_name, date: d.timestamp })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const openDeals = deals.filter(d => d.status !== 'settled' && d.status !== 'cancelled');
  const pipelineValue = openDeals.reduce((s, d) => s + (d.sell_total || 0), 0);
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const settledThisMonth = deals.filter(d => d.status === 'settled' && d.settled_at && d.settled_at.startsWith(ym));
  const profitThisMonth = settledThisMonth.reduce((s, d) => s + (d.profit || 0), 0);

  const dealStatCards = [
    { label: t('open_deals'), value: openDeals.length, icon: Handshake, color: 'bg-navy' },
    { label: t('pipeline_value'), value: `${Math.round(pipelineValue)}`, icon: TrendingUp, color: 'bg-cyan' },
    { label: t('settled_this_month'), value: settledThisMonth.length, icon: CheckCircle, color: 'bg-green' },
    { label: t('profit_this_month'), value: `${Math.round(profitThisMonth)}`, icon: TrendingUp, color: 'bg-green' },
  ];

  const statCards = [
    { label: t('total_buildings'), value: visibleBuildings.length, icon: Building2, color: 'bg-navy' },
    { label: t('active_subscriptions'), value: activeSubs, icon: CheckCircle, color: 'bg-green' },
    { label: t('trialing_subscriptions'), value: trialingSubs, icon: Clock, color: 'bg-cyan' },
    { label: t('todays_pickups'), value: `${pickupsDone}/${pickups.length}`, sub: `${t('pending')}: ${pickupsPending} · ${t('failed')}: ${pickupsFailed}`, icon: Truck, color: 'bg-navy' },
    { label: t('todays_dumps'), value: todayDumps.length, icon: Activity, color: 'bg-green' },
  ];

  const pendingRequests = buildings.filter(b => b.status === 'pickup_requested').length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard')}>
        <PropertyTypeFilter value={typeFilter} onChange={setTypeFilter} className="w-44" />
      </PageHeader>

      {pendingRequests > 0 && (
        <Link to="/new-requests" className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
          <div className="flex items-center gap-3">
            <Inbox className="text-amber-600" />
            <div>
              <p className="font-bold text-amber-700"><span dir="ltr">{pendingRequests}</span> {t('pending_requests')}</p>
              <p className="text-xs text-amber-600">{t('new_requests')}</p>
            </div>
          </div>
          <ChevronLeft className="text-amber-600 rtl:rotate-180" />
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-navy mt-1">{card.value}</p>
                  {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
                </div>
                <div className={`${card.color} p-2 rounded-lg`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dealStatCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-navy mt-1" dir="ltr">{card.value}</p>
                </div>
                <div className={`${card.color} p-2 rounded-lg`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-navy">{t('buildings')}</h2>
            <div className="hidden sm:flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(pt => (
                <span key={pt.value} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTypeColor(pt.value) }} />
                  {t(pt.labelKey)}
                </span>
              ))}
            </div>
          </div>
          <div className="h-80">
            <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {gpsBuildings.map(b => (
                <Marker key={b.id} position={[b.gps_lat, b.gps_lng]} icon={pinIcon(getTypeColor(b.property_type))}>
                  <Popup>
                    <strong>{b.name}</strong><br />
                    {b.address}<br />
                    <span className="text-xs">{t(subStatusMap[b.id] || 'trialing')}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-navy">{t('recent_activity')}</h2>
          </div>
          <div className="divide-y max-h-80 overflow-auto">
            {activities.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">{t('no_data')}</p>
            )}
            {activities.map((a, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(a.date)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}