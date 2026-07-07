import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/i18n';

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function MapPicker({ lat, lng, onChange }) {
  const { t } = useLang();
  const hasPin = lat != null && lng != null;

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
      () => {}
    );
  }

  return (
    <div className="space-y-2">
      <MapContainer center={[lat || 30.09, lng || 31.24]} zoom={15} className="h-56 w-full rounded-lg">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={onChange} />
        {hasPin && <Marker position={[lat, lng]} />}
      </MapContainer>
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
          <LocateFixed size={16} className="me-1" /> {t('use_my_location')}
        </Button>
        {hasPin && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin size={12} /> <span dir="ltr">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span>
          </span>
        )}
      </div>
    </div>
  );
}