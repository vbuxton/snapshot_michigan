import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SpeciesCount {
  species: string;
  count: number;
  color: string;
}

interface MapPoint {
  lat: number;
  lng: number;
  species: SpeciesCount[];
  totalCount: number;
  showColors?: boolean;
}

interface MapViewProps {
  points: MapPoint[];
}

// Create a pie chart marker for multiple species
const createPieMarker = (speciesCounts: SpeciesCount[], radius: number): DivIcon => {
  const size = radius * 2;
  const total = speciesCounts.reduce((sum, s) => sum + s.count, 0);
  
  // Multi-species pie chart
  let currentAngle = 0;
  const paths: string[] = [];
  
  speciesCounts.forEach(sc => {
    const sliceAngle = (sc.count / total) * 2 * Math.PI;
    const startX = radius + (radius - 2) * Math.cos(currentAngle - Math.PI / 2);
    const startY = radius + (radius - 2) * Math.sin(currentAngle - Math.PI / 2);
    const endX = radius + (radius - 2) * Math.cos(currentAngle + sliceAngle - Math.PI / 2);
    const endY = radius + (radius - 2) * Math.sin(currentAngle + sliceAngle - Math.PI / 2);
    
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    
    paths.push(`
      <path d="M ${radius},${radius} L ${startX},${startY} 
        A ${radius - 2},${radius - 2} 0 ${largeArc} 1 ${endX},${endY} Z"
        fill="${sc.color}" opacity="0.9"/>
    `);
    
    currentAngle += sliceAngle;
  });
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${paths.join('')}
      <circle cx="${radius}" cy="${radius}" r="${radius - 2}" 
        fill="none" stroke="#fff" stroke-width="2.5"/>
    </svg>
  `;
  
  return new DivIcon({
    html: svg,
    className: 'custom-pie-marker',
    iconSize: [size, size],
    iconAnchor: [radius, radius],
    popupAnchor: [0, -radius]
  });
};

export const MapView = ({ points }: MapViewProps) => {
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
      {points.map((point, idx) => {
        // Smaller radius when showing all species
        const radius = point.showColors 
          ? Math.min(10 + Math.log(point.totalCount + 1) * 3, 25)
          : Math.min(6 + Math.log(point.totalCount + 1) * 1.5, 15);
        const isSingleSpecies = point.species.length === 1;
        
        // For single species or "All", use CircleMarker with solid color
        if (isSingleSpecies || !point.showColors) {
          return (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${idx}`}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                fillColor: point.species[0].color,
                color: '#357ABD',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
              }}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  {point.showColors ? (
                    <>
                      <strong>{point.species[0].species}</strong><br />
                      Detections: {point.species[0].count}
                    </>
                  ) : (
                    <>
                      <strong>All Species</strong><br />
                      Detections: {point.totalCount}
                    </>
                  )}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                    Lat: {point.lat.toFixed(4)}<br />
                    Lng: {point.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        }
        
        // For multiple species, use custom Marker with pie chart
        return (
          <Marker
            key={`${point.lat}-${point.lng}-${idx}`}
            position={[point.lat, point.lng]}
            icon={createPieMarker(point.species, radius)}
          >
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong>Species at this location:</strong><br />
                {point.species.map((sc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: sc.color, 
                      marginRight: '6px',
                      borderRadius: '2px'
                    }} />
                    <span>{sc.species}: {sc.count}</span>
                  </div>
                ))}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                  <strong>Total: {point.totalCount}</strong><br />
                  Lat: {point.lat.toFixed(4)}<br />
                  Lng: {point.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};
