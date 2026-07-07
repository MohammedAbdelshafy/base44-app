import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

export default function MiniMap({ lat, lng, height = 160 }) {
  if (lat == null || lng == null) return null;
  return (
    <MapContainer center={[lat, lng]} zoom={16} className="w-full rounded-lg" style={{ height }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
}