import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/lib/i18n';

export default function SearchFilter({ searchValue, onSearchChange, filterValue, onFilterChange, filterOptions, filterPlaceholder }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('search')}
          className="ps-9"
        />
      </div>
      {filterOptions && (
        <Select value={filterValue} onValueChange={onFilterChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={filterPlaceholder || t('filter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {filterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}