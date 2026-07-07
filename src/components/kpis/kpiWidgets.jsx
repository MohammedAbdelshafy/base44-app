import React from 'react';

export function Stat({ label, value, sub }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold text-navy" dir="ltr">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub != null && <p className="text-xs text-muted-foreground" dir="ltr">{sub}</p>}
    </div>
  );
}

export function Empty({ text }) {
  return <p className="text-xs text-muted-foreground py-6 text-center">{text || '0'}</p>;
}

export function Table({ headers, rows }) {
  if (!rows || rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {headers.map((h, i) => (
              <th key={i} className="text-start p-2 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="p-2" dir={j === 0 ? undefined : 'ltr'}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}