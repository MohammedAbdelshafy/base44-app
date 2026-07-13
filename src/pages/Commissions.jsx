import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { dataAccess } from '@/api/dataAccess';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Award } from 'lucide-react';
import { getEffectiveRepCode } from '@/lib/salesUtils';
import { useToast } from '@/components/ui/use-toast';

const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatEgp(amount, lang) {
  const whole = Math.round(amount || 0);
  if (lang === 'ar') {
    const arabicNumerals = whole.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    return `${arabicNumerals} جنيه`;
  }
  return `${whole} EGP`;
}

function getYearMonth(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym, lang) {
  const [y, m] = ym.split('-').map(Number);
  const names = lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  return `${names[m - 1]} ${y}`;
}

export default function Commissions() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role;
  const [commissions, setCommissions] = useState([]);
  const [salesMembers, setSalesMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  async function load() {
    try {
      const [c, sm] = await Promise.all([
        dataAccess.commissions.list('-created_date'),
        dataAccess.salesMembers.list(),
      ]);
      setCommissions(c);
      setSalesMembers(sm);
    } catch (err) {
      console.error('Commissions load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Sales rep sees only their own commissions by rep_code (from linked SalesMember)
  let scoped = commissions;
  if (role === 'sales_rep' && user) {
    const effectiveRepCode = getEffectiveRepCode(user, salesMembers);
    scoped = scoped.filter(c => c.rep_code === effectiveRepCode);
  }
  // Bangers see only commissions linked to their SalesMember record
  if (role === 'banger' && user) {
    const mySm = salesMembers.find(sm =>
      (sm.rep_code && user.rep_code && sm.rep_code === user.rep_code) ||
      sm.name === user.full_name
    );
    scoped = mySm ? scoped.filter(c => c.sales_member_id === mySm.id) : [];
  }

  // Available month options from scoped data
  const monthOptions = [];
  const monthSet = new Set();
  scoped.forEach(c => {
    const ym = getYearMonth(c.created_at);
    if (ym && !monthSet.has(ym)) { monthSet.add(ym); monthOptions.push(ym); }
  });
  monthOptions.sort().reverse();

  // Available person options from scoped data
  const personOptions = [];
  const personSet = new Set();
  scoped.forEach(c => {
    if (c.sales_member_id && !personSet.has(c.sales_member_id)) {
      personSet.add(c.sales_member_id);
      personOptions.push({ id: c.sales_member_id, name: c.sales_member_name });
    }
  });

  // Apply all filters
  let filtered = scoped;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.sales_member_name?.toLowerCase().includes(q) ||
      c.building_name?.toLowerCase().includes(q) ||
      c.deal_title?.toLowerCase().includes(q)
    );
  }
  if (personFilter !== 'all') filtered = filtered.filter(c => c.sales_member_id === personFilter);
  if (typeFilter !== 'all') filtered = filtered.filter(c => c.type === typeFilter);
  if (statusFilter !== 'all') filtered = filtered.filter(c => c.status === statusFilter);
  if (monthFilter !== 'all') filtered = filtered.filter(c => getYearMonth(c.created_at) === monthFilter);

  // Summary per person
  const personSummary = {};
  filtered.forEach(c => {
    if (!personSummary[c.sales_member_id]) {
      personSummary[c.sales_member_id] = { name: c.sales_member_name, pending: 0, paid: 0, count: 0 };
    }
    if (c.status === 'pending') personSummary[c.sales_member_id].pending += c.amount;
    else personSummary[c.sales_member_id].paid += c.amount;
    personSummary[c.sales_member_id].count += 1;
  });

  const pendingIds = filtered.filter(c => c.status === 'pending').map(c => c.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every(id => selected.has(id));

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPendingSelected) {
        pendingIds.forEach(id => next.delete(id));
      } else {
        pendingIds.forEach(id => next.add(id));
      }
      return next;
    });
  }

  async function markPaid(ids) {
    const now = new Date().toISOString();
    await supabase.from('commissions').update({ status: 'paid', paid_at: now }).in('id', ids);
    setSelected(new Set());
    toast({ title: `${ids.length} ${t('mark_paid')}` });
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  const detailColCount = role === 'admin' ? 9 : 7;

  return (
    <div className="space-y-4">
      <PageHeader title={t('commissions')}>
        {role === 'admin' && selected.size > 0 && (
          <Button onClick={() => markPaid([...selected])} className="bg-green hover:bg-green/90">
            <Check size={16} className="me-1" /> {t('mark_paid')} ({selected.size})
          </Button>
        )}
      </PageHeader>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border shadow-sm p-3 flex flex-wrap gap-2 items-center">
        <Input
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs flex-1 min-w-[140px]"
        />
        <Select value={personFilter} onValueChange={setPersonFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t('person')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {personOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder={t('type')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="rep_bounty">{t('rep_bounty')}</SelectItem>
            <SelectItem value="manager_override">{t('manager_override')}</SelectItem>
            <SelectItem value="deal_primary">{t('deal_primary')}</SelectItem>
            <SelectItem value="deal_referral">{t('deal_referral')}</SelectItem>
            <SelectItem value="deal_closer_kickback">{t('deal_closer_kickback')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder={t('status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="pending">{t('pending')}</SelectItem>
            <SelectItem value="paid">{t('paid')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t('month')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {monthOptions.map(ym => <SelectItem key={ym} value={ym}>{formatMonthLabel(ym, lang)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-navy">{t('summary')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-start p-3 font-semibold">{t('person')}</th>
                <th className="text-start p-3 font-semibold">{t('pending_amount')}</th>
                <th className="text-start p-3 font-semibold">{t('paid_amount')}</th>
                <th className="text-start p-3 font-semibold">{t('entries')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.keys(personSummary).length === 0 && (
                <tr><td colSpan={4} className="p-12 text-center">
                  <Award size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_commissions')}</p>
                  <p className="text-sm text-muted-foreground">{t('empty_commissions_desc')}</p>
                </td></tr>
              )}
              {Object.entries(personSummary).map(([id, s]) => (
                <tr key={id} className="hover:bg-muted/20">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 font-bold text-amber-600"><span dir="ltr">{formatEgp(s.pending, lang)}</span></td>
                  <td className="p-3 font-bold text-green"><span dir="ltr">{formatEgp(s.paid, lang)}</span></td>
                  <td className="p-3 text-muted-foreground">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {role === 'admin' && (
                  <th className="p-3 w-10">
                    <Checkbox checked={allPendingSelected} onCheckedChange={toggleSelectAll} />
                  </th>
                )}
                <th className="text-start p-3 font-semibold">{t('sales_members')}</th>
                <th className="text-start p-3 font-semibold">{t('type')}</th>
                <th className="text-start p-3 font-semibold">{t('amount')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('building_name')}</th>
                <th className="text-start p-3 font-semibold">{t('status')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('created_at')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('paid_at')}</th>
                {role === 'admin' && <th className="text-start p-3 font-semibold">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={detailColCount} className="p-12 text-center">
                  <Award size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_commissions')}</p>
                  <p className="text-sm text-muted-foreground">{t('empty_commissions_desc')}</p>
                </td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-muted/20">
                  {role === 'admin' && (
                    <td className="p-3">
                      {c.status === 'pending' && (
                        <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                      )}
                    </td>
                  )}
                  <td className="p-3 font-medium">{c.sales_member_name}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      c.type === 'rep_bounty' ? 'bg-cyan/15 text-cyan' :
                      c.type === 'manager_override' ? 'bg-navy/10 text-navy' :
                      c.type === 'deal_primary' ? 'bg-green/15 text-green' :
                      c.type === 'deal_referral' ? 'bg-indigo-500/15 text-indigo-600' :
                      'bg-amber-500/15 text-amber-600'
                    }`}>
                      {t(c.type)}
                    </span>
                  </td>
                  <td className="p-3 font-semibold"><span dir="ltr">{formatEgp(c.amount, lang)}</span></td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{c.building_name || c.deal_title || '—'}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(c.created_at)}</td>
                  <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{c.paid_at ? formatDateTime(c.paid_at) : '—'}</td>
                  {role === 'admin' && (
                    <td className="p-3">
                      {c.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => markPaid([c.id])}>
                          <Check size={14} className="me-1" /> {t('mark_paid')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}