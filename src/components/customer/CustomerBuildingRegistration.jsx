import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MapPicker from '@/components/shared/MapPicker';
import PropertyTypeSelect from '@/components/shared/PropertyTypeSelect';
import { isApartmentType } from '@/lib/propertyTypes';
import { Upload, Loader2 } from 'lucide-react';

export default function CustomerBuildingRegistration({ user, onDone, onCancel }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    phone: user?.phone || '',
    address: '',
    property_type: 'apartment_building',
    gps_lat: null,
    gps_lng: null,
    photo: '',
    num_floors: '',
    num_apartments: '',
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('photo', file_url);
    } catch (err) {}
    setUploading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.phone || !form.address) {
      setError(t('gps_pin_required'));
      return;
    }
    if (form.gps_lat == null || form.gps_lng == null) {
      setError(t('gps_pin_required'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('bawabSignup', {
        name: form.name,
        phone: form.phone,
        address: form.address,
        property_type: form.property_type,
        gps_lat: form.gps_lat,
        gps_lng: form.gps_lng,
        photo: form.photo,
        num_floors: form.num_floors ? Number(form.num_floors) : null,
        num_apartments: form.num_apartments ? Number(form.num_apartments) : null,
        link_user_id: user.id,
      });
      onDone(res?.building_id);
    } catch (err) {
      setError(err.message || 'Error');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-5 space-y-4 max-w-md mx-auto">
      <div>
        <Label>{t('bawab_signup_name')} *</Label>
        <Input value={form.name} onChange={e => set('name', e.target.value)} className="h-12 text-base" required />
      </div>
      <div>
        <Label>{t('bawab_signup_phone')} *</Label>
        <Input type="tel" dir="ltr" value={form.phone} onChange={e => set('phone', e.target.value)} className="h-12 text-base" placeholder="01xxxxxxxxx" required />
      </div>
      <div>
        <Label>{t('address')} *</Label>
        <Textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className="text-base" required />
      </div>
      <div>
        <Label>{t('property_type')} *</Label>
        <PropertyTypeSelect value={form.property_type} onChange={v => set('property_type', v)} className="h-12 text-base" />
      </div>
      <div>
        <Label>{t('gps_location')} *</Label>
        <p className="text-xs text-muted-foreground mb-2">{t('gps_required')}</p>
        <MapPicker lat={form.gps_lat} lng={form.gps_lng} onChange={(lat, lng) => { set('gps_lat', lat); set('gps_lng', lng); }} />
      </div>
      {isApartmentType(form.property_type) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('num_floors')}</Label>
            <Input type="number" value={form.num_floors} onChange={e => set('num_floors', e.target.value)} className="h-12" />
          </div>
          <div>
            <Label>{t('num_apartments')}</Label>
            <Input type="number" value={form.num_apartments} onChange={e => set('num_apartments', e.target.value)} className="h-12" />
          </div>
        </div>
      )}
      <div>
        <Label>{t('photo')}</Label>
        <div className="flex items-center gap-3 mt-1">
          <label className="cursor-pointer bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary/80">
            <Upload size={16} />
            {uploading ? '...' : t('photo')}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
          {form.photo && <img src={form.photo} alt="" className="h-14 w-14 object-cover rounded-lg" />}
        </div>
      </div>
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="h-12">{t('cancel')}</Button>
        )}
        <Button type="submit" disabled={submitting} className="flex-1 h-12 bg-green hover:bg-green/90 text-white font-bold">
          {submitting ? <><Loader2 size={18} className="animate-spin me-2" />{t('submitting')}</> : t('submit_request')}
        </Button>
      </div>
    </form>
  );
}