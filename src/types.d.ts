declare module "react-leaflet" {
  import React from "react"
  const MapContainer: React.FC<any>
  const TileLayer: React.FC<any>
  const Marker: React.FC<any>
  const Popup: React.FC<any>
  const Polyline: React.FC<any>
  const Polygon: React.FC<any>
  const Circle: React.FC<any>
  const GeoJSON: React.FC<any>
  const useMap: any
  const useMapEvents: any
  export { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Circle, GeoJSON, useMap, useMapEvents }
}

declare module "react-leaflet-draw" {
  import React from "react"
  const EditControl: React.FC<any>
  export { EditControl }
}

declare module "html2canvas" {
  const html2canvas: any
  export default html2canvas
}

declare module "jspdf" {
  const jsPDF: any
  export default jsPDF
}

declare module "canvas-confetti" {
  const confetti: any
  export default confetti
}

declare module "qrcode" {
  const QRCode: any
  export default QRCode
}

interface ImportMeta {
  env: Record<string, string>
  glob: (pattern: string) => Record<string, any>
}
