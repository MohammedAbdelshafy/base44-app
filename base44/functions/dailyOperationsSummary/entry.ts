import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function todayCairo(): string {
  const now = new Date();
  const cairo = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return cairo;
}

function escapeCsv(val: unknown): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => escapeCsv(v);
  return [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const args = body.args ?? {};
    const mode = args.mode ?? 'auto';

    const date = todayCairo();

    const [pickups, dumps, payments] = await Promise.all([
      base44.asServiceRole.entities.Pickup.filter({ date }),
      base44.asServiceRole.entities.Dump.list('-created_date', 500),
      base44.asServiceRole.entities.Payment.filter({ payment_date: date }),
    ]);

    const todayDumps = dumps.filter((d: any) =>
      d.timestamp && d.timestamp.startsWith(date)
    );

    const pickupCsv = rowsToCsv(
      ['building_name', 'status', 'driver', 'completion_time', 'failure_reason'],
      pickups.map((p: any) => [
        p.building_name || '',
        p.status || '',
        p.assigned_driver_name || '',
        p.completion_timestamp || '',
        p.failure_reason || '',
      ])
    );

    const dumpCsv = rowsToCsv(
      ['vehicle_name', 'waste_type', 'weight_kg', 'logged_by', 'timestamp'],
      todayDumps.map((d: any) => [
        d.vehicle_name || '',
        d.waste_type || '',
        d.weight_kg != null ? String(d.weight_kg) : '',
        d.logged_by_name || '',
        d.timestamp || '',
      ])
    );

    const paymentCsv = rowsToCsv(
      ['building_name', 'amount', 'collected_by', 'payment_date', 'note'],
      payments.map((p: any) => [
        p.building_name || '',
        p.amount != null ? String(p.amount) : '',
        p.collected_by_name || '',
        p.payment_date || '',
        p.note || '',
      ])
    );

    const csvContent = [
      `=== PICKUPS (${pickups.length}) ===`,
      pickupCsv,
      '',
      `=== DUMPS (${todayDumps.length}) ===`,
      dumpCsv,
      '',
      `=== PAYMENTS (${payments.length}) ===`,
      paymentCsv,
    ].join('\n');

    const summary = [
      `Date: ${date}`,
      `Pickups: ${pickups.filter((p: any) => p.status === 'done').length} done, ${pickups.filter((p: any) => p.status === 'failed').length} failed, ${pickups.filter((p: any) => p.status === 'pending').length} pending`,
      `Dumps: ${todayDumps.length}`,
      `Payments: ${payments.length} (total: ${payments.reduce((s: number, p: any) => s + (p.amount || 0), 0)} EGP)`,
    ].join('\n');

    const existing = await base44.asServiceRole.entities.DailyReport.filter({ date, type: 'operations_summary' });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.DailyReport.update(existing[0].id, {
        csv_content: csvContent,
        summary,
      });
    } else {
      await base44.asServiceRole.entities.DailyReport.create({
        date,
        type: 'operations_summary',
        csv_content: csvContent,
        summary,
      });
    }

    if (mode === 'store_only') {
      return Response.json({ ok: true, date, pickups: pickups.length, dumps: todayDumps.length, payments: payments.length });
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="daily_operations_${date}.csv"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
