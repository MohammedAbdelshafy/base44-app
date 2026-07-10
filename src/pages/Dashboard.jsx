import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { todayCairo, formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle, Clock, Truck, Activity, Handshake, TrendingUp, Inbox, ChevronLeft, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
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
    ...visibleBuildings.slice(0, 5).map(b => ({ type: 'building', label: t('building_registered'), name: b.name, date: b.created_at })),
    ...pickups.filter(p => p.status === 'done').slice(0, 5).map(p => ({ type: 'pickup', label: t('pickup_completed'), name: p.building_name, date: p.completion_timestamp || p.created_at })),
    ...payments.slice(0, 5).map(p => ({ type: 'payment', label: t('payment_recorded'), name: p.building_name, date: p.created_at })),
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
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="glass-panel rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm text-muted-foreground font-semibold">{card.label}</p>
                  <p className="text-3xl font-extrabold text-gradient mt-1">{card.value}</p>
                  {card.sub && <p className="text-xs text-muted-foreground mt-1 bg-white/50 inline-block px-2 py-0.5 rounded-full">{card.sub}</p>}
                </div>
                <div className={`${card.color.replace('bg-', 'bg-gradient-to-br from-').replace('navy', 'navy to-blue-800').replace('cyan', 'cyan to-blue-400').replace('green', 'green to-emerald-500')} p-3 rounded-xl shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Deal stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dealStatCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1), duration: 0.4 }}
              className="glass-panel rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm text-muted-foreground font-semibold">{card.label}</p>
                  <p className="text-3xl font-extrabold text-gradient mt-1" dir="ltr">{card.value}</p>
                </div>
                <div className={`${card.color.replace('bg-', 'bg-gradient-to-br from-').replace('navy', 'navy to-blue-800').replace('cyan', 'cyan to-blue-400').replace('green', 'green to-emerald-500')} p-3 rounded-xl shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col"
        >
          <div className="p-5 border-b bg-white/40 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">{t('buildings')}</h2>
            <div className="hidden sm:flex flex-wrap gap-3">
              {PROPERTY_TYPES.map(pt => (
                <span key={pt.value} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white/60 px-2 py-1 rounded-md shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: getTypeColor(pt.value) }} />
                  {t(pt.labelKey)}
                </span>
              ))}
            </div>
          </div>
          <div className="h-80 relative">
            <MapContainer center={center} zoom={14} className="h-full w-full z-0" scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {gpsBuildings.map(b => (
                <Marker key={b.id} position={[b.gps_lat, b.gps_lng]} icon={pinIcon(getTypeColor(b.property_type))}>
                  <Popup className="rounded-lg shadow-xl">
                    <strong className="text-navy">{b.name}</strong><br />
                    <span className="text-muted-foreground text-sm">{b.address}</span><br />
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green/10 text-green rounded text-xs font-bold">{t(subStatusMap[b.id] || 'trialing')}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] z-10" />
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="glass-panel rounded-2xl flex flex-col"
        >
          <div className="p-5 border-b bg-white/40">
            <h2 className="text-lg font-bold text-navy">{t('recent_activity')}</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {activities.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">{t('no_data')}</p>
            )}
            <div className="space-y-1 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:ml-6 md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-navy/20 before:to-transparent">
              {activities.map((a, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (i * 0.1) }}
                  key={i} 
                  className="relative pl-8 md:pl-10 py-3 group"
                >
                  <div className="absolute left-1 md:left-2 top-4 w-3 h-3 bg-white border-2 border-cyan rounded-full group-hover:scale-125 transition-transform shadow-sm" />
                  <div className="bg-white/60 hover:bg-white/90 transition-colors rounded-xl p-3 shadow-sm border border-white/50">
                    <p className="text-sm font-bold text-navy">{a.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.name}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 opacity-70">
                      <Calendar size={12} />
                      {formatDateTime(a.date)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}