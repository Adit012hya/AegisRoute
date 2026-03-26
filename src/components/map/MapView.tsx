import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix generic Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SafetyPoint {
    name: string;
    location: { lat: number; lng: number };
    type: 'police' | 'hospital' | 'store' | 'residential_secure';
}

interface MapViewProps {
    center: { lat: number; lng: number };
    routePath?: { lat: number; lng: number }[];
    fitBounds?: google.maps.LatLngBounds;
    businessCount?: number;
    midpoint?: { lat: number; lng: number };
    safetyPoints?: SafetyPoint[];
    isLoadedExternally?: boolean;
}

const createCustomIcon = (color: string, isPolice: boolean) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: ${color}; width: ${isPolice ? '24px' : '16px'}; height: ${isPolice ? '24px' : '16px'}; border-radius: 50%; border: ${isPolice ? '3px' : '2px'} solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
        iconSize: [isPolice ? 28 : 20, isPolice ? 28 : 20],
        iconAnchor: [isPolice ? 14 : 10, isPolice ? 14 : 10],
    });
};

const safeZoneIcon = L.divIcon({
    className: 'safe-zone-icon',
    html: `<div style="background-color: white; width: 12px; height: 12px; border-radius: 50%; border: 2px solid black; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const defaultMidpointIcon = L.divIcon({
    className: 'midpoint-icon',
    html: `<div style="opacity: 0;"></div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
});

// Component to handle bounds change dynamically
const BoundsFitter: React.FC<{ bounds?: google.maps.LatLngBounds, routePath?: {lat: number, lng: number}[], center: {lat: number, lng: number} }> = ({ bounds, routePath, center }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && typeof bounds.getNorthEast === 'function') {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const leafletBounds = L.latLngBounds(
                L.latLng(sw.lat(), sw.lng()),
                L.latLng(ne.lat(), ne.lng())
            );
            map.fitBounds(leafletBounds, { padding: [20, 20] });
        } else if (routePath && routePath.length > 0) {
            const leafletBounds = L.latLngBounds(routePath.map(p => [p.lat, p.lng]));
            map.fitBounds(leafletBounds, { padding: [20, 20] });
        } else {
            map.setView([center.lat, center.lng], 14);
        }
    }, [map, bounds, routePath, center]);
    return null;
};

const MapView: React.FC<MapViewProps> = ({ center, routePath, fitBounds, businessCount, midpoint, safetyPoints, isLoadedExternally }) => {
    if (isLoadedExternally === false) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                Loading Map...
            </div>
        );
    }

    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={14}
            style={{ width: '100%', height: '100%', backgroundColor: '#1e293b', zIndex: 0 }}
            zoomControl={false} // can add it later
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            <BoundsFitter bounds={fitBounds} routePath={routePath} center={center} />

            {routePath && (
                <Polyline
                    positions={routePath.map(p => [p.lat, p.lng])}
                    pathOptions={{ color: '#10b981', weight: 6, opacity: 0.8 }}
                />
            )}

            {/* Render Safety Points */}
            {safetyPoints?.map((point, idx) => {
                if (point.type === 'police' || point.type === 'hospital') {
                    const isPolice = point.type === 'police';
                    const color = isPolice ? "#3b82f6" : "#ef4444";
                    
                    return (
                        <React.Fragment key={idx}>
                            <Marker
                                position={[point.location.lat, point.location.lng]}
                                icon={createCustomIcon(color, isPolice)}
                            >
                                <Tooltip>{point.name}</Tooltip>
                            </Marker>
                            {isPolice && (
                                <CircleMarker
                                    center={[point.location.lat, point.location.lng]}
                                    radius={40} // Leaflet's CircleMarker radius is in pixels, but good enough for visual
                                    pathOptions={{
                                        fillColor: "#3b82f6",
                                        fillOpacity: 0.15,
                                        weight: 1,
                                        color: "#3b82f6",
                                        opacity: 0.3
                                    }}
                                />
                            )}
                        </React.Fragment>
                    );
                }

                // Safe Zones - Small White Flags
                return (
                    <Marker
                        key={idx}
                        position={[point.location.lat, point.location.lng]}
                        icon={safeZoneIcon}
                    >
                        <Tooltip>{point.name}</Tooltip>
                    </Marker>
                );
            })}

            {midpoint && businessCount !== undefined && (
                <Marker
                    position={[midpoint.lat, midpoint.lng]}
                    icon={defaultMidpointIcon}
                >
                    <Tooltip permanent opacity={0.9} direction="top">
                        {businessCount} active safety zones nearby
                    </Tooltip>
                </Marker>
            )}
        </MapContainer>
    );
};

export default MapView;

