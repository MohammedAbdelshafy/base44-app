import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { uploadFile } from '@/api/uploadFile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Upload } from 'lucide-react';
import PropertyTypeSelect from '@/components/shared/PropertyTypeSelect';
import PropertyContactFields from '@/components/buildings/PropertyContactFields';

const WEEKDAYS_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function MapPicker({ lat, lng, onChange }) {
  function ClickHandler() {
    useMapEvents({
      click(e) {
        onChange(e.latlng.lat, e.latlng.lng);
      }
    });
    return null;
  }
  return (
    <MapContainer center={[lat || 30.09, lng || 31.24]} zoom={15} className="h-48 w-full rounded-lg">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}

export default function BuildingForm({ open, onClose, building, onSaved }) {
  const { t } = useLang();
  const { user } = useAuth();
  const isSalesRep = user?.role === 'sales_rep';
  const [form, setForm] = useState({
    name: '', address: '', property_type: 'apartment_building', gps_lat: null, gps_lng: null, photo: '',
    bawab_name: '', bawab_phone: '', contact_person_name: '', contact_person_phone: '',
    num_floors: '', num_apartments: '',
    notes: '', rep_code: '', collection_frequency: 'daily',
    collection_days_per_week: 3, collection_weekdays: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (building) {
      setForm({
        name: building.name || '',
        address: building.address || '',
        property_type: building.property_type || 'apartment_building',
        gps_lat: building.gps_lat || null,
        gps_lng: building.gps_lng || null,
        photo: building.photo || '',
        bawab_name: building.bawab_name || '',
        bawab_phone: building.bawab_phone || '',
        contact_person_name: building.contact_person_name || '',
        contact_person_phone: building.contact_person_phone || '',
        num_floors: building.num_floors || '',
        num_apartments: building.num_apartments || '',
        notes: building.notes || '',
        rep_code: building.rep_code || '',
        collection_frequency: building.collection_frequency || 'daily',
        collection_days_per_week: building.collection_days_per_week || 3,
        collection_weekdays: building.collection_weekdays || [],
      });
    } else {
      setForm({
        name: '', address: '', property_type: 'apartment_building', gps_lat: null, gps_lng: null, photo: '',
        bawab_name: '', bawab_phone: '', contact_person_name: '', contact_person_phone: '',
        num_floors: '', num_apartments: '',
        notes: '', rep_code: isSalesRep ? (user?.rep_code || '') : '', collection_frequency: 'daily',
        collection_days_per_week: 3, collection_weekdays: [],
      });
    }
  }, [building, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const [validateError, setValidateError] = useState('');

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile(file);
    set('photo', file_url);
    setUploading(false);
  }

  async function handleSave() {
    setValidateError('');
    if (!form.name?.trim()) {
      setValidateError(t('building_name_required'));
      return;
    }
    if (!form.address?.trim()) {
      setValidateError(t('address_required'));
      return;
    }
    if (!isSalesRep && !form.rep_code?.trim()) {
      setValidateError(t('rep_code_required'));
      return;
    }
    setSaving(true);
    const data = {
      ...form,
      num_floors: form.num_floors ? Number(form.num_floors) : null,
      num_apartments: form.num_apartments ? Number(form.num_apartments) : null,
    };
    if (building) {
      await supabase.from('buildings').update(data).eq('id', building.id);
    } else {
      const { data: createdData } = await supabase.from('buildings').insert([data]).select().single();
      // Auto-create subscription
      const today = new Date().toISOString().split('T')[0];
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 1);
      await supabase.from('subscriptions').insert([{
        building_id: createdData?.id,
        plan_name: 'Warraq Building Collection',
        status: 'trialing',
        monthly_price: 100,
        trial_start_date: today,
        trial_end_date: trialEnd.toISOString().split('T')[0],
      }]);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  function toggleWeekday(day) {
    const days = [...form.collection_weekdays];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    set('collection_weekdays', days);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{building ? t('edit_building') : t('add_building')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>{t('building_name')} *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <Label>{t('rep_code')}</Label>
              <Input value={form.rep_code} onChange={e => set('rep_code', e.target.value)} disabled={isSalesRep} />
            </div>
          </div>
          <div>
            <Label>{t('address')} *</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <Label>{t('property_type')} *</Label>
            <PropertyTypeSelect value={form.property_type} onChange={v => set('property_type', v)} />
          </div>
          <PropertyContactFields type={form.property_type} form={form} set={set} />

          {/* Photo */}
          <div>
            <Label>{t('photo')}</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="cursor-pointer bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary/80">
                <Upload size={16} />
                {uploading ? '...' : t('photo')}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              {form.photo && <img src={form.photo} alt="" className="h-16 w-16 object-cover rounded-lg" />}
            </div>
          </div>

          {/* Map */}
          <div>
            <Label>{t('gps_location')}</Label>
            <p className="text-xs text-muted-foreground mb-1">{t('gps_location')}</p>
            <MapPicker lat={form.gps_lat} lng={form.gps_lng} onChange={(lat, lng) => { set('gps_lat', lat); set('gps_lng', lng); }} />
          </div>

          {/* Collection schedule */}
          <div>
            <Label>{t('collection_frequency')}</Label>
            <Select value={form.collection_frequency} onValueChange={v => set('collection_frequency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('daily')}</SelectItem>
                <SelectItem value="custom">{t('custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.collection_frequency === 'custom' && (
            <div>
              <Label>{t('weekdays')}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {WEEKDAYS_KEYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.collection_weekdays.includes(i)}
                      onCheckedChange={() => toggleWeekday(i)}
                    />
                    {t(d)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>{t('notes')}</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.address} className="bg-navy hover:bg-navy/90">
            {saving ? '...' : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}