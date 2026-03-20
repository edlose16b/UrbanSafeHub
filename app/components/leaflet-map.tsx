"use client";

import { MapContainer, TileLayer } from "react-leaflet";

const LIMA_CENTER: [number, number] = [-12.0464, -77.0428];
const INITIAL_ZOOM = 13;

export default function LeafletMap() {
  return (
    <MapContainer
      center={LIMA_CENTER}
      zoom={INITIAL_ZOOM}
      scrollWheelZoom
      className="w-screen h-screen"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
