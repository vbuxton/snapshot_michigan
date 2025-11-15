import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPoint {
  lat: number;
  lng: number;
  count: number;
}

interface MapViewProps {
  points: MapPoint[];
  selectedSpecies: string;
}

export const MapView = ({ points, selectedSpecies }: MapViewProps) => {
  if (points.length === 0) {
    return <div className="no-data">No location data available for selected filters</div>;
  }

  const center: [number, number] = [points[0].lat, points[0].lng];

  return (
    <MapContainer 
      center={center} 
      zoom={7} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point, idx) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${idx}`}
          center={[point.lat, point.lng]}
          radius={Math.min(8 + Math.log(point.count + 1) * 2, 20)}
          fillColor="#4A90E2"
          color="#357ABD"
          weight={2}
          opacity={0.8}
          fillOpacity={0.6}
        >
          <Popup>
            <strong>{selectedSpecies}</strong><br />
            Detections: {point.count}<br />
            Lat: {point.lat.toFixed(4)}<br />
            Lng: {point.lng.toFixed(4)}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};
