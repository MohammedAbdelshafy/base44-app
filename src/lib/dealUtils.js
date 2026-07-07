import { nowCairo } from '@/lib/dateUtils';

export const DEAL_STATUSES = ['lead', 'negotiating', 'agreed', 'in_delivery', 'settled', 'cancelled'];

export const STATUS_DATE_FIELD = {
  lead: 'lead_date',
  negotiating: 'negotiating_date',
  agreed: 'agreed_date',
  in_delivery: 'in_delivery_date',
  settled: 'settled_at',
  cancelled: 'cancelled_date',
};

export const NEXT_STATUS = {
  lead: 'negotiating',
  negotiating: 'agreed',
  agreed: 'in_delivery',
  in_delivery: 'settled',
};

export const MATERIALS = ['plastic_pet', 'plastic_hdpe', 'plastic_other', 'cardboard', 'paper', 'metal', 'glass', 'used_cooking_oil', 'organic', 'other'];
export const UNITS = ['kg', 'ton', 'pieces', 'liters'];

export function calcProfit(deal) {
  return (deal.sell_total || 0) - (deal.buy_total || 0) - (deal.other_costs || 0);
}

export function getStageDate(deal) {
  const field = STATUS_DATE_FIELD[deal.status];
  return deal[field] || deal.created_date;
}

export function daysInStage(deal) {
  const stageDate = getStageDate(deal);
  if (!stageDate) return 0;
  const diff = Date.now() - new Date(stageDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function calcCommissions(deal) {
  const profit = calcProfit(deal);
  if (profit <= 0) return { profit, pool: 0, closerKickback: 0, entries: [] };

  const pool = profit * 0.10;
  const closerKickback = profit * 0.015;
  const entries = [];
  const split = (deal.referral_split_percent || 50) / 100;

  if (deal.referrer_id) {
    const referrerAmount = pool * split;
    const primaryAmount = pool - referrerAmount;
    entries.push({
      sales_member_id: deal.referrer_id,
      sales_member_name: deal.referrer_name,
      type: 'deal_referral',
      amount: Math.round(referrerAmount),
    });
    entries.push({
      sales_member_id: deal.primary_banger_id,
      sales_member_name: deal.primary_banger_name,
      type: 'deal_primary',
      amount: Math.round(primaryAmount),
    });
  } else {
    entries.push({
      sales_member_id: deal.primary_banger_id,
      sales_member_name: deal.primary_banger_name,
      type: 'deal_primary',
      amount: Math.round(pool),
    });
  }

  if (deal.closer_id) {
    entries.push({
      sales_member_id: deal.closer_id,
      sales_member_name: deal.closer_name,
      type: 'deal_closer_kickback',
      amount: Math.round(closerKickback),
    });
  }

  return { profit, pool, closerKickback, entries };
}

export function statusDateUpdate(newStatus) {
  const field = STATUS_DATE_FIELD[newStatus];
  if (!field) return {};
  return { status: newStatus, [field]: nowCairo().toISOString() };
}