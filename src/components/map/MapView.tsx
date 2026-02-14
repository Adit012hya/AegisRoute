import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Polyline, Circle, Marker } from '@react-google-maps/api';



const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

interface SafetyPoint {
    name: string;
    location: google.maps.LatLngLiteral;
    type: 'police' | 'hospital' | 'store' | 'residential_secure';
}

interface MapViewProps {
    center: { lat: number; lng: number };
    routePath?: google.maps.LatLngLiteral[];
    fitBounds?: google.maps.LatLngBounds;
    businessCount?: number;
    midpoint?: google.maps.LatLngLiteral;
    safetyPoints?: SafetyPoint[];
    isLoadedExternally: boolean;
}

const darkModeStyles: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
];

// ... (MapView component)

const MapView: React.FC<MapViewProps> = ({ center, routePath, fitBounds, businessCount, midpoint, safetyPoints, isLoadedExternally }) => {
    const options = useMemo<google.maps.MapOptions>(
        () => ({
            styles: darkModeStyles,
            disableDefaultUI: false,
            zoomControl: true,
        }),
        []
    );

    const mapRef = useRef<google.maps.Map | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        if (fitBounds) {
            map.fitBounds(fitBounds);
        }
    }, [fitBounds]);

    useEffect(() => {
        if (mapRef.current && fitBounds) {
            mapRef.current.fitBounds(fitBounds);
        }
    }, [fitBounds]);

    if (!isLoadedExternally) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                Loading Map...
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={14}
            center={center}
            options={options}
            onLoad={onLoad}
        >
            {routePath && (
                <Polyline
                    path={routePath}
                    options={{
                        strokeColor: "#10b981", // Emerald 500
                        strokeOpacity: 0.8,
                        strokeWeight: 6,
                    }}
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
                                position={point.location}
                                title={point.name}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    fillColor: color,
                                    fillOpacity: 1,
                                    strokeColor: "#ffffff",
                                    strokeWeight: isPolice ? 3 : 2,
                                    scale: isPolice ? 12 : 8, // Highlighted police stations
                                }}
                            />
                            {isPolice && (
                                <Circle
                                    center={point.location}
                                    radius={150}
                                    options={{
                                        fillColor: "#3b82f6",
                                        fillOpacity: 0.15,
                                        strokeWeight: 1,
                                        strokeColor: "#3b82f6",
                                        strokeOpacity: 0.3
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
                        position={point.location}
                        title={point.name}
                        icon={{
                            path: 'M0 0 L0 12 M0 0 L8 4 L0 8 Z', // Small flag path
                            fillColor: "#ffffff",
                            fillOpacity: 1,
                            strokeColor: "#000000",
                            strokeWeight: 1,
                            scale: 1,
                            anchor: new google.maps.Point(0, 12)
                        }}
                    />
                );
            })}

            {midpoint && businessCount !== undefined && (
                <Marker
                    position={midpoint}
                    opacity={0}
                    title={`${businessCount} active safety zones nearby`}
                />
            )}
        </GoogleMap>
    );
};

export default MapView;
