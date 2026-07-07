import moment from 'moment';

// All dates in Africa/Cairo timezone
export function nowCairo() {
  return moment().utcOffset('+02:00');
}

export function todayCairo() {
  return nowCairo().format('YYYY-MM-DD');
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return moment(dateStr).utcOffset('+02:00').format('YYYY/MM/DD hh:mm A');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return moment(dateStr).utcOffset('+02:00').format('YYYY/MM/DD');
}

export function formatTime(dateStr) {
  if (!dateStr) return '—';
  return moment(dateStr).utcOffset('+02:00').format('hh:mm A');
}

export function addMonths(dateStr, months) {
  return moment(dateStr).add(months, 'months').format('YYYY-MM-DD');
}