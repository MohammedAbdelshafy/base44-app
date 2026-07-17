import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Target, Send, Mail, Phone, Building2,
  TrendingUp, AlertCircle,
  ChevronDown, ChevronRight, ExternalLink, Search,
  BarChart3, MapPin
} from 'lucide-react';
import QRCodeDisplay from '@/components/shared/QRCodeDisplay';

const DASHBOARD_VERSION = '1.0';

const DEFAULT_TARGETS = [
  { company: 'PipHouse LLC', email: 'PipHousellc@gmail.com', phone: '469-658-4582', pain: 'Lead management', deal: '$3,500-5,000', market: 'Dallas-Fort Worth', source: 'Pipeline', status: 'outreach_sent' },
  { company: 'Swift Home Solutions', email: 'investments@swifthomesolutions.com', phone: '469-273-1235', pain: 'Multi-market follow-up', deal: '$4,000-6,000', market: 'Dallas-Fort Worth', source: 'Pipeline', status: 'bounced' },
  { company: 'New Western', email: 'sales@newwestern.com', phone: '(972) 734-1612', pain: 'Scale matching', deal: '$10,000-20,000', market: 'Dallas-Fort Worth', source: 'Pipeline', status: 'outreach_sent' },
  { company: 'DFW REI Club', email: 'robin@dfwrei.com', phone: '817-300-1132', pain: 'Member management', deal: '$2,500-4,000', market: 'Dallas-Fort Worth', source: 'Pipeline', status: 'outreach_sent' },
  { company: 'Ambition Group LLC', email: 'nathan@ambitionrealtygroup.com', phone: '817-934-6630', pain: '477 transactions, $91.9M volume', deal: '$15,000-25,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'Altura Builders DFW LLC', email: '', phone: '214-284-1222', pain: '236 transactions, $882.3M volume', deal: '$20,000-35,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'bounced' },
  { company: 'Ellis Acquisitions LLC', email: 'info@ellishomesource.com', phone: '972-256-7500', pain: '205 transactions, $54.1M volume', deal: '$10,000-18,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'Spectra Homes LLC', email: '', phone: '', pain: '35 transactions, $26.7M volume', deal: '$6,000-10,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'Halim Capital Investments LLC', email: '', phone: '', pain: '51 transactions, $12.7M volume', deal: '$7,000-12,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'DFW Investor Lending LLC', email: 'info@dfwil.com', phone: '214-382-2676', pain: 'Active flipper, needs deal flow automation', deal: '$5,000-8,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'Homeward Property Management', email: 'office@homewarddfw.com', phone: '469-649-7666', pain: 'Tenant screening, maintenance, rent collection', deal: '$4,500-7,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'LEAP Property Management', email: 'info@leapdfw.com', phone: '214-310-1630', pain: '50+ rental properties needs automation', deal: '$5,000-8,000', market: 'Dallas-Fort Worth', source: 'New Targets', status: 'active' },
  { company: 'All Wholesale Properties', email: 'info@allwholesaleproperties.com', phone: '817-550-5069', pain: '20yr manual process', deal: '$4,000-6,000', market: 'Dallas-Fort Worth', source: 'MultiMarket', status: 'active' },
  { company: 'Houston Wholesale Homes', email: 'info@houstontowholesalehomes.com', phone: '', pain: 'Lead generation', deal: '$5,000', market: 'Houston', source: 'MultiMarket', status: 'active' },
  { company: 'Texas Home Buyers', email: 'info@texashomebuyers.com', phone: '', pain: 'Follow-up automation', deal: '$4,500', market: 'Houston', source: 'MultiMarket', status: 'active' },
  { company: 'Bayou City Investments', email: 'info@bayoucityinvestments.com', phone: '', pain: 'Deal analysis', deal: '$6,000', market: 'Houston', source: 'MultiMarket', status: 'active' },
  { company: 'Austin Wholesale Deal', email: 'info@austinwholesaledeal.com', phone: '', pain: 'Hot market competition', deal: '$6,000', market: 'Austin', source: 'MultiMarket', status: 'active' },
  { company: 'ATX Home Buyers', email: 'info@atxhomebuyers.com', phone: '', pain: 'Lead qualification', deal: '$5,000', market: 'Austin', source: 'MultiMarket', status: 'active' },
  { company: 'Lone Star Property Solutions', email: 'info@lonestarpropertysolutions.com', phone: '', pain: 'Multi-channel marketing', deal: '$5,500', market: 'Austin', source: 'MultiMarket', status: 'active' },
  { company: 'Alamo City Investments', email: 'info@alamocityinvestments.com', phone: '', pain: 'Lead management', deal: '$5,000', market: 'San Antonio', source: 'MultiMarket', status: 'active' },
  { company: 'San Antonio Wholesale', email: 'info@sanantoniowholesale.com', phone: '', pain: 'Email automation', deal: '$4,500', market: 'San Antonio', source: 'MultiMarket', status: 'active' },
  { company: 'Desert Rose Investments', email: 'info@desertroseinvestments.com', phone: '', pain: 'Out-of-state buyers', deal: '$6,000', market: 'Phoenix', source: 'MultiMarket', status: 'active' },
  { company: 'Phoenix Wholesale Deals', email: 'info@phoenixwholesaledeals.com', phone: '', pain: 'Lead generation', deal: '$5,000', market: 'Phoenix', source: 'MultiMarket', status: 'active' },
  { company: 'Peach State Investments', email: 'info@peachstateinvestments.com', phone: '', pain: 'Market expansion', deal: '$6,000', market: 'Atlanta', source: 'MultiMarket', status: 'active' },
  { company: 'ATL Wholesale Properties', email: 'info@atlwholesaleproperties.com', phone: '', pain: 'Lead qualification', deal: '$5,000', market: 'Atlanta', source: 'MultiMarket', status: 'active' },
  { company: 'Music City Investments', email: 'info@musiccityinvestments.com', phone: '', pain: 'Hot market speed', deal: '$6,000', market: 'Nashville', source: 'MultiMarket', status: 'active' },
  { company: 'Nashville Wholesale Deals', email: 'info@nashvillewholesaledeals.com', phone: '', pain: 'Buyer outreach', deal: '$5,000', market: 'Nashville', source: 'MultiMarket', status: 'active' },
  { company: 'Mile High Investments', email: 'info@milehighinvestments.com', phone: '', pain: 'High-priced market', deal: '$7,000', market: 'Denver', source: 'MultiMarket', status: 'active' },
  { company: 'Nevada Real Estate Investors', email: 'info@nevadarealestateinvestors.com', phone: '', pain: 'Out-of-state buyers', deal: '$6,000', market: 'Las Vegas', source: 'MultiMarket', status: 'active' },
  { company: 'Charlotte Wholesale Homes', email: 'info@charlottewholesalehomes.com', phone: '', pain: 'Lead management', deal: '$5,000', market: 'Charlotte', source: 'MultiMarket', status: 'active' },
];

const MARKET_COLORS = {
  'Dallas-Fort Worth': 'bg-blue-500/10 text-blue-400',
  'Houston': 'bg-green-500/10 text-green-400',
  'Austin': 'bg-purple-500/10 text-purple-400',
  'San Antonio': 'bg-amber-500/10 text-amber-400',
  'Phoenix': 'bg-orange-500/10 text-orange-400',
  'Atlanta': 'bg-rose-500/10 text-rose-400',
  'Nashville': 'bg-pink-500/10 text-pink-400',
  'Denver': 'bg-cyan-500/10 text-cyan-400',
  'Las Vegas': 'bg-yellow-500/10 text-yellow-400',
  'Charlotte': 'bg-emerald-500/10 text-emerald-400',
};

function targetStatusColor(status) {
  const map = {
    'active': 'text-green-400 bg-green-500/10',
    'outreach_sent': 'text-blue-400 bg-blue-500/10',
    'bounced': 'text-red-400 bg-red-500/10',
    'meeting': 'text-purple-400 bg-purple-500/10',
    'negotiation': 'text-yellow-400 bg-yellow-500/10',
    'closed': 'text-emerald-400 bg-emerald-500/10',
    'lost': 'text-gray-500 bg-gray-500/10',
  };
  return map[status] || 'text-gray-400 bg-gray-500/10';
}

function TargetRow({ target, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="bg-[#111125]/80 border border-white/5 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${target.email ? 'bg-green-500' : target.phone ? 'bg-amber-500' : 'bg-red-500'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{target.company}</p>
          <p className="text-[10px] text-gray-500 truncate">{target.email || target.phone || 'No contact'}</p>
        </div>
        <div className="hidden md:block text-[10px] text-gray-500 w-24 truncate">{target.market}</div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full hidden sm:inline ${targetStatusColor(target.status || 'active')}`}>
          {target.status || 'active'}
        </span>
        {expanded ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-2">
              {target.pain && (
                <div className="flex items-start gap-2">
                  <AlertCircle size={12} className="text-amber-400 mt-0.5" />
                  <p className="text-[10px] text-gray-400">{target.pain}</p>
                </div>
              )}
              {target.deal && (
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <TrendingUp size={12} />
                  <span>Deal value: <span className="text-green-400 font-medium">{target.deal}</span></span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {target.email && (
                  <a href={`mailto:${target.email}`} className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full hover:bg-blue-500/20">
                    <Mail size={10} /> {target.email}
                  </a>
                )}
                {target.phone && (
                  <a href={`tel:${target.phone}`} className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/20">
                    <Phone size={10} /> {target.phone}
                  </a>
                )}
                {target.market && (
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${MARKET_COLORS[target.market] || 'text-gray-500 bg-gray-500/10'}`}>
                    <MapPin size={10} /> {target.market}
                  </span>
                )}
                <span className="text-[10px] text-gray-600 bg-gray-500/10 px-2 py-0.5 rounded-full">{target.source}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ClientHuntDashboard() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTargets(DEFAULT_TARGETS);
    setLoading(false);
  }, []);

  const sources = [...new Set(targets.map(t => t.source))];
  const markets = [...new Set(targets.map(t => t.market).filter(Boolean))];
  const statuses = [...new Set(targets.map(t => t.status || 'active'))];

  const filtered = targets.filter(t => {
    if (search && !t.company.toLowerCase().includes(search.toLowerCase()) && !t.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
    if (statusFilter !== 'all' && (t.status || 'active') !== statusFilter) return false;
    if (marketFilter !== 'all' && t.market !== marketFilter) return false;
    return true;
  });

  const bySource = {};
  targets.forEach(t => { bySource[t.source] = (bySource[t.source] || 0) + 1; });

  const byStatus = {};
  targets.forEach(t => { const s = t.status || 'active'; byStatus[s] = (byStatus[s] || 0) + 1; });

  const byMarket = {};
  targets.forEach(t => { if (t.market) byMarket[t.market] = (byMarket[t.market] || 0) + 1; });

  const totalDealValue = targets.reduce((sum, t) => {
    const match = t.deal?.match(/\$?([0-9,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
  }, 0);

  const withEmail = targets.filter(t => t.email).length;
  const withPhone = targets.filter(t => t.phone).length;
  const outreachSent = targets.filter(t => t.status === 'outreach_sent').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading Client Hunt Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <Target className="text-purple-400" size={18} />
            <h1 className="text-base font-bold">Client <span className="text-purple-400">Hunt</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <QRCodeDisplay />
            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {targets.length} targets
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-500/20 rounded-xl p-4">
            <Users size={16} className="text-purple-400 mb-2" />
            <p className="text-xl font-bold">{targets.length}</p>
            <p className="text-[10px] text-gray-500">Total Targets</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-500/20 rounded-xl p-4">
            <Mail size={16} className="text-blue-400 mb-2" />
            <p className="text-xl font-bold">{withEmail}</p>
            <p className="text-[10px] text-gray-500">With Email</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/10 border border-green-500/20 rounded-xl p-4">
            <Phone size={16} className="text-green-400 mb-2" />
            <p className="text-xl font-bold">{withPhone}</p>
            <p className="text-[10px] text-gray-500">With Phone</p>
          </div>
          <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/10 border border-amber-500/20 rounded-xl p-4">
            <Send size={16} className="text-amber-400 mb-2" />
            <p className="text-xl font-bold">{outreachSent}</p>
            <p className="text-[10px] text-gray-500">Outreach Sent</p>
          </div>
        </div>

        {/* Pipeline Value + Markets */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-[#111125]/80 border border-white/5 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pipeline Value</h3>
            <p className="text-2xl font-bold text-green-400">${(totalDealValue / 1000).toFixed(0)}K+</p>
            <p className="text-[10px] text-gray-500 mt-1">Estimated total deal value across all targets</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(byStatus).map(([status, count]) => (
                <span key={status} className={`text-[10px] px-2 py-0.5 rounded-full ${targetStatusColor(status)}`}>
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#111125]/80 border border-white/5 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Markets</h3>
            <div className="space-y-1.5">
              {Object.entries(byMarket).sort((a, b) => b[1] - a[1]).map(([market, count]) => (
                <div key={market} className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${MARKET_COLORS[market] || 'text-gray-500 bg-gray-500/10'}`}>
                    {market}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / targets.length) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-[#111125]/80 border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sources</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(bySource).map(([source, count]) => (
              <div key={source} className="bg-[#0a0a1a] border border-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-purple-400">{count}</p>
                <p className="text-[10px] text-gray-500">{source}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#111125] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="bg-[#111125] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-purple-500/50">
            <option value="all">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#111125] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-purple-500/50">
            <option value="all">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={marketFilter} onChange={e => setMarketFilter(e.target.value)} className="bg-[#111125] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-purple-500/50">
            <option value="all">All Markets</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Target List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-600 px-4 pb-1">
            <span>{filtered.length} of {targets.length} targets</span>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Target size={32} className="mx-auto mb-2 text-gray-700" />
              <p className="text-xs text-gray-600">No targets match your filters</p>
            </div>
          ) : (
            filtered.map((target, i) => (
              <TargetRow key={`${target.company}-${i}`} target={target} index={i} />
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/20 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <a href="/demo" className="inline-flex items-center gap-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/20 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:bg-purple-600/30">
              <ExternalLink size={12} /> Demo Landing Page
            </a>
            <a href="/mbm" className="inline-flex items-center gap-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:bg-blue-600/30">
              <BarChart3 size={12} /> MBM Dashboard
            </a>
            <a href="/demo-pages/" className="inline-flex items-center gap-1.5 bg-green-600/20 text-green-300 border border-green-500/20 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:bg-green-600/30">
              <Building2 size={12} /> Demo Pages
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
