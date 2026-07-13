import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { dataAccess } from '@/api/dataAccess';
import { useLang } from '@/lib/i18n';
import { todayCairo } from '@/lib/dateUtils';
import { canAccess } from '@/lib/roles';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, Building2, Truck, CreditCard, Award,
  Warehouse, Users, UsersRound, Car, UserCog, Handshake, UserCheck,
  Inbox, FileText, Activity, TrendingUp, CheckCircle,
  ChevronLeft, Calendar, Bell
} from 'lucide-react';

const moduleIcons = {
  dashboard: LayoutDashboard,
  kpis: BarChart3,
  buildings: Building2,
  pickups: Truck,
  todays_route: Truck,
  payments: CreditCard,
  commissions: Award,
  warehouse: Warehouse,
  users: Users,
  customers: UsersRound,
  vehicles: Car,
  sales_members: UserCog,
  dealing_room: Handshake,
  drivers: UserCheck,
  new_requests: Inbox,
  my_building: Building2,
  reports: FileText,
};

const moduleColors = {
  dashboard: 'from-blue-600 to-blue-400',
  kpis: 'from-purple-600 to-purple-400',
  buildings: 'from-emerald-600 to-emerald-400',
  pickups: 'from-orange-600 to-orange-400',
  todays_route: 'from-amber-600 to-amber-400',
  payments: 'from-green-600 to-green-400',
  commissions: 'from-cyan-600 to-cyan-400',
  warehouse: 'from-slate-600 to-slate-400',
  users: 'from-indigo-600 to-indigo-400',
  customers: 'from-teal-600 to-teal-400',
  vehicles: 'from-rose-600 to-rose-400',
  sales_members: 'from-violet-600 to-violet-400',
  dealing_room: 'from-pink-600 to-pink-400',
  drivers: 'from-sky-600 to-sky-400',
  new_requests: 'from-red-600 to-red-400',
  my_building: 'from-lime-600 to-lime-400',
  reports: 'from-stone-600 to-stone-400',
};

export default function MyWorkDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dataAccess.buildings.list().catch(() => []),
      dataAccess.subscriptions.list().catch(() => []),
      dataAccess.pickups.list().catch(() => []),
      dataAccess.deals.list('-created_date', 200).catch(() => []),
      dataAccess.payments.list('-created_date', 10).catch(() => []),
      dataAccess.dumps.list('-created_date', 50).catch(() => []),
    ]).then(([buildings, subscriptions, pickups, deals, payments, dumps]) => {
      const todayStr = todayCairo();
      setStats({
        buildings: buildings.length,
        activeSubs: subscriptions.filter(s => s.status === 'active').length,
        trialingSubs: subscriptions.filter(s => s.status === 'trialing').length,
        todayPickups: pickups.filter(p => p.date === todayStr).length,
        openDeals: deals.filter(d => d.status !== 'settled' && d.status !== 'cancelled').length,
        pendingRequests: buildings.filter(b => b.status === 'pickup_requested').length,
        todayDumps: dumps.filter(d => d.timestamp?.startsWith(todayStr)).length,
      });
      setLoading(false);
    });
  }, []);

  const role = user?.role;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('good_morning');
    if (h < 18) return t('good_afternoon');
    return t('good_evening');
  })();

  const navItems = [
    { key: 'dashboard', path: '/', module: 'dashboard' },
    { key: 'kpis', path: '/kpis', module: 'kpis' },
    { key: 'buildings', path: '/buildings', module: 'buildings' },
    { key: 'pickups', path: '/pickups', module: 'pickups' },
    { key: 'todays_route', path: '/todays-route', module: 'todays_route' },
    { key: 'payments', path: '/payments', module: 'payments' },
    { key: 'commissions', path: '/commissions', module: 'commissions' },
    { key: 'dealing_room', path: '/dealing-room', module: 'dealing_room' },
    { key: 'warehouse', path: '/warehouse', module: 'warehouse' },
    { key: 'vehicles', path: '/vehicles', module: 'vehicles' },
    { key: 'sales_members', path: '/sales-members', module: 'sales_members' },
    { key: 'drivers', path: '/drivers', module: 'drivers' },
    { key: 'new_requests', path: '/new-requests', module: 'new_requests' },
    { key: 'my_building', path: '/my-building', module: 'my_building' },
    { key: 'users', path: '/users', module: 'users', label: 'team' },
    { key: 'reports', path: '/reports', module: 'reports' },
    { key: 'customers', path: '/customers', module: 'customers' },
  ];

  const visibleModules = navItems.filter(item => canAccess(role, item.module));

  const todayDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-full space-y-5 pb-8">
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-navy via-navy/95 to-blue-900 rounded-3xl p-5 md:p-7 text-white relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-8 bottom-0 w-32 h-32 bg-cyan/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-white/70">{greeting}{user?.full_name ? `, ${user?.full_name?.split(' ')[0]}` : ''}</h2>
              <h1 className="text-2xl md:text-3xl font-extrabold mt-1 tracking-tight">{t('my_work')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-white/15 px-3 py-1.5 rounded-full font-semibold backdrop-blur-sm">
                {t(role)}
              </span>
            </div>
          </div>
          <p className="text-sm text-white/60 mt-3 flex items-center gap-2">
            <Calendar size={14} />
            {todayDate}
          </p>
        </div>
      </motion.div>

      {/* Summary Stats */}
      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {[
            { label: t('total_buildings'), value: stats.buildings, icon: Building2, color: 'from-emerald-500 to-emerald-400' },
            { label: t('active_subscriptions'), value: stats.activeSubs, icon: CheckCircle, color: 'from-green-500 to-green-400' },
            { label: t('todays_pickups'), value: stats.todayPickups, icon: Truck, color: 'from-orange-500 to-orange-400' },
            { label: t('open_deals'), value: stats.openDeals, icon: TrendingUp, color: 'from-pink-500 to-pink-400' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex-shrink-0 w-36 bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-sm`}>
                <stat.icon size={18} className="text-white" />
              </div>
              <p className="text-2xl font-extrabold text-navy">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-36 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-200 mb-3" />
              <div className="h-7 w-12 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests Banner */}
      {!loading && stats.pendingRequests > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to="/new-requests"
            className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-700">
                  <span dir="ltr">{stats.pendingRequests}</span> {t('pending_requests')}
                </p>
                <p className="text-xs text-amber-600">{t('new_requests')}</p>
              </div>
            </div>
            <ChevronLeft size={20} className="text-amber-500 rtl:rotate-180" />
          </Link>
        </motion.div>
      )}

      {/* Quick Access Grid */}
      <div>
        <h3 className="text-lg font-extrabold text-navy mb-3 flex items-center gap-2">
          <Activity size={18} className="text-cyan" />
          {t('quick_access')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {visibleModules.map((item, i) => {
            const Icon = moduleIcons[item.key] || LayoutDashboard;
            const color = moduleColors[item.key] || 'from-navy to-blue-800';
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={item.path}
                  className="flex flex-col items-center gap-2.5 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.97]"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-navy text-center leading-tight">
                    {t(item.label || item.key)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Links Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-cyan/5 to-blue-500/5 rounded-2xl p-4 border border-cyan/10"
      >
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">{t('shortcuts')}:</span>
          <Link to="/kpis" className="shrink-0 text-sm font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border hover:bg-navy hover:text-white transition-colors text-navy">
            {t('kpis')}
          </Link>
          <Link to="/reports" className="shrink-0 text-sm font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border hover:bg-navy hover:text-white transition-colors text-navy">
            {t('reports')}
          </Link>
          {stats.pendingRequests > 0 && (
            <Link to="/new-requests" className="shrink-0 text-sm font-medium bg-amber-50 px-3 py-1.5 rounded-full shadow-sm border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
              {t('new_requests')} ({stats.pendingRequests})
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
