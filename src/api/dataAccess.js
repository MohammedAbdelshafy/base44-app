import { supabase } from './supabaseClient';

function parseSort(sortStr) {
  if (!sortStr) return { column: 'created_at', ascending: false };
  const descending = sortStr.startsWith('-');
  const column = descending ? sortStr.slice(1) : sortStr;
  return { column, ascending: !descending };
}

async function list(table, sortStr, limit) {
  let query = supabase.from(table).select('*');
  if (sortStr) {
    const { column, ascending } = parseSort(sortStr);
    query = query.order(column, { ascending });
  }
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function filter(table, filters, sortStr) {
  let query = supabase.from(table).select('*');
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
  }
  if (sortStr) {
    const { column, ascending } = parseSort(sortStr);
    query = query.order(column, { ascending });
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export const dataAccess = {
  buildings: {
    list: (sort, limit) => list('buildings', sort, limit),
    filter: (filters, sort) => filter('buildings', filters, sort),
  },
  subscriptions: {
    list: (sort, limit) => list('subscriptions', sort, limit),
    filter: (filters, sort) => filter('subscriptions', filters, sort),
  },
  pickups: {
    list: (sort, limit) => list('pickups', sort, limit),
    filter: (filters, sort) => filter('pickups', filters, sort),
  },
  dumps: {
    list: (sort, limit) => list('dumps', sort, limit),
    filter: (filters, sort) => filter('dumps', filters, sort),
  },
  payments: {
    list: (sort, limit) => list('payments', sort, limit),
    filter: (filters, sort) => filter('payments', filters, sort),
  },
  deals: {
    list: (sort, limit) => list('deals', sort, limit),
    filter: (filters, sort) => filter('deals', filters, sort),
  },
  commissions: {
    list: (sort, limit) => list('commissions', sort, limit),
    filter: (filters, sort) => filter('commissions', filters, sort),
  },
  salesMembers: {
    list: (sort, limit) => list('sales_members', sort, limit),
    filter: (filters, sort) => filter('sales_members', filters, sort),
  },
  users: {
    list: (sort, limit) => list('users', sort, limit),
    filter: (filters, sort) => filter('users', filters, sort),
  },
  vehicles: {
    list: (sort, limit) => list('vehicles', sort, limit),
    filter: (filters, sort) => filter('vehicles', filters, sort),
  },
  invitations: {
    list: (sort, limit) => list('invitations', sort, limit),
    filter: (filters, sort) => filter('invitations', filters, sort),
  },
  dailyReports: {
    list: (sort, limit) => list('daily_reports', sort, limit),
    filter: (filters, sort) => filter('daily_reports', filters, sort),
  },
  buildingNotes: {
    list: (sort, limit) => list('building_notes', sort, limit),
    filter: (filters, sort) => filter('building_notes', filters, sort),
  },
};
