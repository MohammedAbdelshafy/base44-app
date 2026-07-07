import React from 'react';
import { useLang } from '@/lib/i18n';
import { getTypeColor, typeLabelKey } from '@/lib/propertyTypes';

export default function PropertyTypeBadge({ type, withDot = true }) {
  const { t } = useLang();
  const color = getTypeColor(type);
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: color + '1a', color }}
    >
      {withDot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {t(typeLabelKey(type))}
    </span>
  );
}