'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Webpack環境でのLeafletマーカーアイコン修正
const fixLeafletIcons = () => {
  type IconDefaultWithUrl = L.Icon.Default & { _getIconUrl?: () => string };
  delete (L.Icon.Default.prototype as IconDefaultWithUrl)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};
fixLeafletIcons();

interface Props {
  lat: number;
  lng: number;
  radius: number;
  onPinChange: (lat: number, lng: number) => void;
}

function MapController({ lat, lng, radius, onPinChange }: Props) {
  const map = useMap();

  // GPS取得などで外部からlat/lngが変わったら地図を移動
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
  }, [lat, lng, map]);

  useMapEvents({
    click(e) {
      onPinChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      <Marker
        position={[lat, lng]}
        draggable
        eventHandlers={{
          dragend(e) {
            const pos = (e.target as L.Marker).getLatLng();
            onPinChange(pos.lat, pos.lng);
          },
        }}
      />
      <Circle
        center={[lat, lng]}
        radius={radius}
        pathOptions={{
          color: '#f59e0b',
          weight: 2,
          fillColor: '#fef3c7',
          fillOpacity: 0.25,
        }}
      />
    </>
  );
}

export function MapPinSearch({ lat, lng, radius, onPinChange }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: '260px', width: '100%', borderRadius: '12px', zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController lat={lat} lng={lng} radius={radius} onPinChange={onPinChange} />
    </MapContainer>
  );
}
