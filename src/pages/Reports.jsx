import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import PageHeader from '@/components/shared/PageHeader';
import { todayCairo } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, FileText, Calendar } from 'lucide-react';

export default function Reports() {
  const { t } = useLang();
  const [report, setReport] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const today = todayCairo();
      const [todayReports, allReports] = await Promise.all([
        base44.entities.DailyReport.filter({ date: today, type: 'operations_summary' }),
        base44.entities.DailyReport.list('-created_date', 50),
      ]);
      if (todayReports && todayReports.length > 0) {
        setReport(todayReports[0]);
      } else {
        setReport(null);
      }
      setRecentReports((allReports || []).slice(0, 7));
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await supabase.functions.invoke('dailyOperationsSummary', { body: { mode: 'store_only' } });
      if (res.ok) {
        await loadReports();
      }
    } catch (e) {
      console.error('Failed to generate report', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (csvContent, date) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_operations_${date || todayCairo()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseSummary = (summary) => {
    if (!summary) return null;
    const lines = summary.split('\n');
    const data = {};
    lines.forEach(line => {
      const [key, ...rest] = line.split(': ');
      if (key && rest.length) data[key.trim()] = rest.join(': ').trim();
    });
    return data;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  const summaryData = parseSummary(report?.summary);

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports')}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadReports} disabled={loading}>
            <RefreshCw size={14} className="mr-1" />
            {t('refresh')}
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            <FileText size={14} className="mr-1" />
            {generating ? t('generating') : t('generate_report')}
          </Button>
        </div>
      </PageHeader>

      {/* Today's Report */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-navy" />
            <h2 className="font-semibold text-navy">{t('todays_report')}</h2>
          </div>
          {report && (
            <Button size="sm" onClick={() => handleDownload(report.csv_content, report.date)}>
              <Download size={14} className="mr-1" />
              {t('download_csv')}
            </Button>
          )}
        </div>
        {!report ? (
          <div className="p-8 text-center">
            <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{t('no_report_today')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate} disabled={generating}>
              <FileText size={14} className="mr-1" />
              {t('generate_now')}
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {summaryData && Object.entries(summaryData).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">{key}</span>
                <span className="text-sm font-semibold text-navy">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reports */}
      {recentReports.length > 1 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-navy">{t('recent_reports')}</h2>
          </div>
          <div className="divide-y">
            {recentReports.filter(r => !report || r.id !== report.id).map(r => {
              const s = parseSummary(r.summary);
              return (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{r.date}</p>
                    {s && <p className="text-xs text-muted-foreground">{s['Pickups'] || ''}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(r.csv_content, r.date)}>
                    <Download size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
