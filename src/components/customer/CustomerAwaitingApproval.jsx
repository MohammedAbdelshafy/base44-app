import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MiniMap from '@/components/shared/MiniMap';
import { Clock, MessageCircle, MapPin, Phone, Edit2, Check, AlertCircle } from 'lucide-react';

const WHATSAPP = '201022795313';

export default function CustomerAwaitingApproval({ building, onUpdated }) {
  const { t } = useLang();
  const isRejected = building.status === 'rejected';
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(building.bawab_phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  async function savePhone() {
    setSavingPhone(true);
    try {
      await supabase.from('buildings').update({ bawab_phone: phone }).eq('id', building.id);
      setEditingPhone(false);
      onUpdated();
    } catch (e) {
      setPhone(building.bawab_phone || '');
      setEditingPhone(false);
    }
    setSavingPhone(false);
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full ${isRejected ? 'bg-red-100' : 'bg-amber-100'}`}>
          {isRejected ? <AlertCircle className="w-8 h-8 text-red-600" /> : <Clock className="w-8 h-8 text-amber-600" />}
        </div>
        <h1 className="text-lg font-bold text-navy mb-1">
          {isRejected ? t('building_rejected_title') : t('request_awaiting_title')}
        </h1>
        {!isRejected && <p className="text-sm text-muted-foreground">{t('request_awaiting_desc')}</p>}
        {isRejected && building.rejection_reason && (
          <p className="text-sm text-red-600 mt-2">{building.rejection_reason}</p>
        )}
      </div>

      {building.gps_lat && building.gps_lng && (
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-sm font-semibold text-navy mb-2 flex items-center gap-1"><MapPin size={14} /> {t('gps_location')}</p>
          <MiniMap lat={building.gps_lat} lng={building.gps_lng} />
        </div>
      )}

      {!isRejected && (
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-navy flex items-center gap-1"><Phone size={14} /> {t('bawab_signup_phone')}</p>
            {!editingPhone && (
              <button onClick={() => setEditingPhone(true)} className="text-cyan text-xs flex items-center gap-1">
                <Edit2 size={12} /> {t('edit_phone')}
              </button>
            )}
          </div>
          {editingPhone ? (
            <div className="flex gap-2">
              <Input type="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} className="h-10" />
              <Button size="sm" onClick={savePhone} disabled={savingPhone} className="bg-navy hover:bg-navy/90">
                <Check size={14} />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" dir="ltr">{phone || '—'}</p>
          )}
        </div>
      )}

      <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-green hover:bg-green/90 text-white rounded-xl py-4 font-bold transition-colors">
        <MessageCircle size={22} /> {t('contact_whatsapp')}
      </a>

      <p className="text-center text-sm">
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
          {t('add_another_building')}
        </a>
      </p>
    </div>
  );
}