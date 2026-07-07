import moment from 'moment';

// All KPI date math uses Africa/Cairo offset
export function ymOf(dateStr) {
  if (!dateStr) return null;
  const m = moment(dateStr);
  if (!m.isValid()) return null;
  return m.utcOffset('+02:00').format('YYYY-MM');
}

export function inMonth(dateStr, ym) {
  return ymOf(dateStr) === ym;
}

export function currentYM() {
  return moment().utcOffset('+02:00').format('YYYY-MM');
}

export function buildLastMonths(n) {
  const arr = [];
  const base = moment().utcOffset('+02:00').startOf('month');
  for (let i = n - 1; i >= 0; i--) {
    const m = base.clone().subtract(i, 'months');
    arr.push({ ym: m.format('YYYY-MM'), label: m.format('MM/YYYY') });
  }
  return arr;
}

function buildLastWeeks(n) {
  const arr = [];
  const base = moment().utcOffset('+02:00').startOf('isoWeek');
  for (let i = n - 1; i >= 0; i--) {
    const start = base.clone().subtract(i, 'weeks');
    const end = start.clone().endOf('isoWeek');
    arr.push({ start, end, label: start.format('DD/MM') });
  }
  return arr;
}

function weekIndexOf(dateStr, weeks) {
  if (!dateStr) return -1;
  const m = moment(dateStr);
  if (!m.isValid()) return -1;
  for (let i = 0; i < weeks.length; i++) {
    if (!m.isBefore(weeks[i].start) && !m.isAfter(weeks[i].end)) return i;
  }
  return -1;
}

export function computeGrowth(buildings, ym) {
  const monthB = buildings.filter(b => ymOf(b.created_date) === ym);
  const bySource = { staff: 0, self: 0 };
  const byType = {};
  monthB.forEach(b => {
    if (b.source === 'bawab_signup') bySource.self++; else bySource.staff++;
    const ty = b.property_type || 'apartment_building';
    byType[ty] = (byType[ty] || 0) + 1;
  });
  const pendingRequests = buildings.filter(b => b.status === 'pickup_requested').length;
  const approved = monthB.filter(b => b.status === 'active').length;
  const rejected = monthB.filter(b => b.status === 'rejected').length;
  const approvalRate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

  const weeks = buildLastWeeks(8);
  const weekly = weeks.map(w => ({ label: w.label, staff: 0, self: 0 }));
  buildings.forEach(b => {
    const idx = weekIndexOf(b.created_date, weeks);
    if (idx < 0) return;
    if (b.source === 'bawab_signup') weekly[idx].self++; else weekly[idx].staff++;
  });

  return { bySource, byType, pendingRequests, approvalRate, weekly, monthCount: monthB.length };
}

export function computeSubscriptions(subscriptions, ym) {
  const byStatus = { trialing: 0, active: 0, paused: 0, cancelled: 0 };
  subscriptions.forEach(s => { if (byStatus[s.status] !== undefined) byStatus[s.status]++; });
  const trialsStarted = subscriptions.filter(s => ymOf(s.trial_start_date) === ym).length;
  const converted = subscriptions.filter(s => ymOf(s.converted_at) === ym).length;
  const conversionRate = trialsStarted > 0 ? Math.round((converted / trialsStarted) * 100) : 0;
  const churn = subscriptions.filter(s => s.status === 'cancelled' && ymOf(s.cancelled_at || s.updated_date) === ym).length;
  const mrr = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.monthly_price || 0), 0);
  return { byStatus, trialsStarted, converted, conversionRate, churn, mrr, activeCount: byStatus.active };
}

export function computeRevenue(payments, deals, ym) {
  const cashCollected = payments
    .filter(p => ymOf(p.payment_date) === ym)
    .reduce((s, p) => s + (p.amount || 0), 0);
  const settledDeals = deals.filter(d => d.status === 'settled' && ymOf(d.settled_at) === ym);
  const dealProfit = settledDeals.reduce((s, d) => s + (d.profit || 0), 0);
  const materialsSoldValue = settledDeals.reduce((s, d) => s + (d.sell_total || 0), 0);

  const series = buildLastMonths(6).map(m => {
    const cash = payments.filter(p => ymOf(p.payment_date) === m.ym).reduce((s, p) => s + (p.amount || 0), 0);
    const profit = deals.filter(d => d.status === 'settled' && ymOf(d.settled_at) === m.ym).reduce((s, d) => s + (d.profit || 0), 0);
    return { label: m.label, ym: m.ym, revenue: Math.round(cash + profit), cash: Math.round(cash), profit: Math.round(profit) };
  });

  return {
    cashCollected,
    dealProfit,
    materialsSoldValue,
    settledCount: settledDeals.length,
    series,
  };
}

export function computeSales(buildings, subscriptions, commissions, deals, salesMembers, ym) {
  const reps = salesMembers.filter(sm => sm.member_role === 'rep');
  const repStats = reps.map(rep => {
    const repBuildings = buildings.filter(b => b.rep_code && b.rep_code === rep.rep_code);
    const signups = repBuildings.filter(b => ymOf(b.created_date) === ym).length;
    const ids = new Set(repBuildings.map(b => b.id));
    const conversions = subscriptions.filter(s => ids.has(s.building_id) && ymOf(s.converted_at) === ym).length;
    const conversionRate = signups > 0 ? Math.round((conversions / signups) * 100) : 0;
    const repComms = commissions.filter(c => c.sales_member_id === rep.id || c.sales_member_name === rep.name);
    const pending = repComms.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
    const paid = repComms.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0);
    return { name: rep.name, signups, conversions, conversionRate, pending: Math.round(pending), paid: Math.round(paid) };
  }).filter(r => r.signups || r.conversions || r.pending || r.paid);

  const bangerMap = {};
  deals.forEach(d => {
    const name = d.primary_banger_name;
    if (!name) return;
    if (!bangerMap[name]) bangerMap[name] = { name, settled: 0, profit: 0, pipeline: 0 };
    if (d.status === 'settled' && ymOf(d.settled_at) === ym) {
      bangerMap[name].settled++;
      bangerMap[name].profit += (d.profit || 0);
    }
    if (d.status !== 'settled' && d.status !== 'cancelled') {
      bangerMap[name].pipeline += (d.sell_total || 0);
    }
  });
  const bangerStats = Object.values(bangerMap).map(b => ({
    name: b.name, settled: b.settled, profit: Math.round(b.profit), pipeline: Math.round(b.pipeline),
  })).filter(b => b.settled || b.pipeline);

  const monthOverrides = commissions.filter(c => c.type === 'manager_override' && ymOf(c.created_date) === ym);
  const managerTotal = monthOverrides.reduce((s, c) => s + (c.amount || 0), 0);
  const mgrMap = {};
  monthOverrides.forEach(c => {
    const name = c.sales_member_name || '—';
    if (!mgrMap[name]) mgrMap[name] = 0;
    mgrMap[name] += (c.amount || 0);
  });
  const byManager = Object.entries(mgrMap).map(([name, amount]) => ({ name, amount: Math.round(amount) }));

  return { repStats, bangerStats, managerTotal: Math.round(managerTotal), byManager };
}