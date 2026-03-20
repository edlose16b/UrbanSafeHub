"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
});

export default function MapScreen() {
  return <LeafletMap />;
}
