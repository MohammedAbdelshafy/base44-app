import React from 'react';
import { useLang } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApartmentType } from '@/lib/propertyTypes';

// Used by the staff BuildingForm: apartment buildings use bawab + floors/apartments;
// all other property types use a contact person and hide floors/apartments.
export default function PropertyContactFields({ type, form, set, big = false }) {
  const { t } = useLang();
  const cls = big ? 'h-12 text-base' : '';

  if (isApartmentType(type)) {
    return (
      <>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t('bawab_name')}</Label>
            <Input value={form.bawab_name || ''} onChange={e => set('bawab_name', e.target.value)} className={cls} />
          </div>
          <div>
            <Label>{t('bawab_phone')}</Label>
            <Input value={form.bawab_phone || ''} onChange={e => set('bawab_phone', e.target.value)} dir="ltr" className={cls} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t('num_floors')}</Label>
            <Input type="number" value={form.num_floors || ''} onChange={e => set('num_floors', e.target.value)} className={cls} />
          </div>
          <div>
            <Label>{t('num_apartments')}</Label>
            <Input type="number" value={form.num_apartments || ''} onChange={e => set('num_apartments', e.target.value)} className={cls} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <Label>{t('contact_person_name')}</Label>
        <Input value={form.contact_person_name || ''} onChange={e => set('contact_person_name', e.target.value)} className={cls} />
      </div>
      <div>
        <Label>{t('contact_person_phone')}</Label>
        <Input type="tel" dir="ltr" value={form.contact_person_phone || ''} onChange={e => set('contact_person_phone', e.target.value)} className={cls} placeholder="01xxxxxxxxx" />
      </div>
    </div>
  );
}