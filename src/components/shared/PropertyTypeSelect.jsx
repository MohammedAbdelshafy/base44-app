import React from 'react';
import { useLang } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROPERTY_TYPES } from '@/lib/propertyTypes';

export default function PropertyTypeSelect({ value, onChange, className }) {
  const { t } = useLang();
  return (
    <Select value={value || 'apartment_building'} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROPERTY_TYPES.map(pt => (
          <SelectItem key={pt.value} value={pt.value}>
            {t(pt.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PropertyTypeFilter({ value, onChange, className }) {
  const { t } = useLang();
  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('all')}</SelectItem>
        {PROPERTY_TYPES.map(pt => (
          <SelectItem key={pt.value} value={pt.value}>
            {t(pt.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}