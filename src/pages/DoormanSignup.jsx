import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { uploadFile } from '@/api/uploadFile';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MapPicker from '@/components/shared/MapPicker';
import PropertyTypeSelect from '@/components/shared/PropertyTypeSelect';
import { isApartmentType } from '@/lib/propertyTypes';
import { Truck, Upload, CheckCircle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const WHATSAPP = '201022795313';

export default function DoormanSignup() {
  const { t, isRTL } = useLang();
  const [form, setForm] = useState({ name: '', phone: '', address: '', property_type: 'apartment_building', gps_lat: null, gps_lng: null, photo: '', num_floors: '', num_apartments: '' });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('photo', file_url);
    } catch (err) {
      // ignore photo errors
    }
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
      const res = await supabase.functions.invoke('bawabSignup', { body: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        property_type: form.property_type,
        gps_lat: form.gps_lat,
        gps_lng: form.gps_lng,
        photo: form.photo,
        num_floors: form.num_floors ? Number(form.num_floors) : null,
        num_apartments: form.num_apartments ? Number(form.num_apartments) : null,
      }});
      if (res?.building_id) localStorage.setItem('bawab_building_id', res.building_id);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Error');
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gradient-to-b from-navy to-navy/80 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={48} className="text-green" />
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">{t('request_received_title')}</h1>
          <p className="text-muted-foreground mb-6">{t('request_received_desc')}</p>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full bg-green hover:bg-green/90 text-white rounded-xl py-4 font-bold text-lg transition-colors"
          >
            <MessageCircle size={22} /> {t('contact_whatsapp')}
          </a>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 w-full bg-navy hover:bg-navy/90 text-white rounded-xl py-3 font-bold text-sm transition-colors mt-2"
          >
            {t('create_account_track')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-muted/30">
      <div className="max-w-md mx-auto p-4 pb-10">
        <div className="text-center pt-6 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-navy flex items-center justify-center mx-auto mb-3">
            <Truck size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-navy leading-snug">{t('register_building')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('register_building_sub')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
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

          <Button type="submit" disabled={submitting} className="w-full h-14 bg-green hover:bg-green/90 text-white text-lg font-bold">
            {submitting ? t('submitting') : t('submit_request')}
          </Button>
        </form>
      </div>
    </div>
  );
}