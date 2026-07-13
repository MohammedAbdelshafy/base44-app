import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { dataAccess } from '@/api/dataAccess';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { statusDateUpdate, NEXT_STATUS } from '@/lib/dealUtils';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DealForm from '@/components/dealingroom/DealForm';
import DealCard from '@/components/dealingroom/DealCard';
import SettleDialog from '@/components/dealingroom/SettleDialog';
import { Plus, Handshake } from 'lucide-react';

const STATUS_FILTERS = ['all', 'lead', 'negotiating', 'agreed', 'in_delivery', 'settled', 'cancelled'];

export default function DealingRoom() {
  const { t } = useLang();
  const { user } = useAuth();
  const role = user?.role;
  const [deals, setDeals] = useState([]);
  const [salesMembers, setSalesMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [settleDeal, setSettleDeal] = useState(null);

  async function load() {
    try {
      const [d, sm] = await Promise.all([
        dataAccess.deals.list('-created_date'),
        dataAccess.salesMembers.list(),
      ]);
      setDeals(d);
      setSalesMembers(sm);
    } catch (err) {
      console.error('DealingRoom load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const bangers = salesMembers.filter(sm => sm.member_role === 'banger' && sm.is_active !== false);

  // Bangers see only their deals
  let scoped = deals;
  if (role === 'banger') {
    const mySm = salesMembers.find(sm =>
      (sm.rep_code && user?.rep_code && sm.rep_code === user.rep_code) ||
      sm.name === user?.full_name
    );
    if (mySm) {
      scoped = scoped.filter(d =>
        d.primary_banger_id === mySm.id ||
        d.referrer_id === mySm.id ||
        d.closer_id === mySm.id
      );
    } else {
      scoped = [];
    }
  }

  let filtered = scoped;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.seller_factory_name?.toLowerCase().includes(q) ||
      d.buyer_factory_name?.toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(d => d.status === statusFilter);
  }

  async function advanceStatus(deal) {
    const next = NEXT_STATUS[deal.status];
    if (!next) return;
    await supabase.from('deals').update(statusDateUpdate(next)).eq('id', deal.id);
    load();
  }

  async function cancelDeal(deal) {
    await supabase.from('deals').update(statusDateUpdate('cancelled')).eq('id', deal.id);
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('dealing_room')}>
        <Button onClick={() => { setEditDeal(null); setFormOpen(true); }} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('add_deal')}
        </Button>
      </PageHeader>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-navy text-white' : 'bg-white border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t(s === 'all' ? 'all' : s)}
            {s !== 'all' && (
              <span className="ms-1.5 opacity-70" dir="ltr">
                {scoped.filter(d => d.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <Input
        placeholder={t('search')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <Handshake size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-navy mb-1">{t('empty_deals')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('empty_deals_desc')}</p>
          <Button onClick={() => { setEditDeal(null); setFormOpen(true); }} className="bg-navy hover:bg-navy/90">
            <Plus size={16} className="me-1" /> {t('add_deal')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => (
            <DealCard
              key={d.id}
              deal={d}
              onEdit={(deal) => { setEditDeal(deal); setFormOpen(true); }}
              onAdvance={advanceStatus}
              onSettle={(deal) => setSettleDeal(deal)}
              onCancel={cancelDeal}
              canSettle={role === 'admin' || role === 'ops'}
            />
          ))}
        </div>
      )}

      <DealForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        deal={editDeal}
        bangers={bangers}
        onSaved={load}
      />

      <SettleDialog
        deal={settleDeal}
        bangers={bangers}
        onClose={() => setSettleDeal(null)}
        onSettled={load}
      />
    </div>
  );
}