export interface RouteDataSource {
    overview_polyline: string;
}

export interface SafetyPoint {
    name: string;
    location: google.maps.LatLngLiteral;
    type: 'police' | 'hospital' | 'store' | 'building' | 'residential_secure';
}

export interface BusinessDensityResult {
    businessCount: number;
    midpoint: google.maps.LatLngLiteral;
    points: SafetyPoint[];
    safetyScore: number;
    policeCount: number;
    hospitalCount: number;
    storeCount: number;
    buildingCount: number;
    error?: string;
}

// Helper to calculate sampling points along a polyline
const calculateSamplingPoints = (encodedPolyline: string, count: number = 3): google.maps.LatLngLiteral[] => {
    if (!window.google || !window.google.maps || !window.google.maps.geometry) return [];

    const path = google.maps.geometry.encoding.decodePath(encodedPolyline);
    if (!path || path.length === 0) return [];

    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
    }

    const points: google.maps.LatLngLiteral[] = [];
    const divisions = count + 1;

    for (let j = 1; j <= count; j++) {
        const targetDistance = (totalDistance / divisions) * j;
        let currentDistance = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
            if (currentDistance + segmentDistance >= targetDistance) {
                const fraction = (targetDistance - currentDistance) / segmentDistance;
                const point = google.maps.geometry.spherical.interpolate(path[i], path[i + 1], fraction);
                points.push(point.toJSON());
                break;
            }
            currentDistance += segmentDistance;
        }
    }

    if (points.length === 0) points.push(path[Math.floor(path.length / 2)].toJSON());
    return points;
};

export const getMidpoint = async (route: RouteDataSource): Promise<BusinessDensityResult> => {
    try {
        if (!window.google || !window.google.maps) {
            return { businessCount: 0, midpoint: { lat: 0, lng: 0 }, points: [], safetyScore: 0, policeCount: 0, hospitalCount: 0, storeCount: 0, buildingCount: 0, error: "Google Maps API not loaded" };
        }

        // High-Precision Sampling: increase to 6 points along the path
        const samplingPoints = calculateSamplingPoints(route.overview_polyline, 6);
        const midpoint = samplingPoints[Math.floor(samplingPoints.length / 2)];

        const service = new google.maps.places.PlacesService(document.createElement('div'));
        const allPoints: (SafetyPoint & { id: string })[] = [];
        let policeBonus = 0;
        let hospitalBonus = 0;

        const storeTypes = ['store', 'shopping_mall', 'clothing_store', 'grocery_or_supermarket', 'pharmacy', 'cafe', 'restaurant', 'convenience_store'];

        const searchPromises = samplingPoints.map(point => {
            return new Promise<void>((resolve) => {
                const request: google.maps.places.PlaceSearchRequest = {
                    location: point,
                    radius: 800,
                    keyword: 'police|hospital|supermarket|pharmacy|cafe|convenience_store|active|establishment|point_of_interest|building',
                    openNow: true
                };

                service.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        results.forEach(res => {
                            const placeId = res.place_id || `${res.geometry?.location?.lat()}-${res.geometry?.location?.lng()}`;

                            // Strict De-duplication by place_id
                            const isDuplicate = allPoints.some(p => p.id === placeId);

                            if (!isDuplicate) {
                                let type: SafetyPoint['type'] = 'building'; // Default to building

                                if (res.types?.includes('police')) {
                                    type = 'police';
                                    policeBonus += 20; // Adjusted bonus for more points
                                } else if (res.types?.includes('hospital') || res.types?.includes('doctor')) {
                                    type = 'hospital';
                                    hospitalBonus += 10;
                                } else if (res.types?.some(t => storeTypes.includes(t)) || res.name?.toLowerCase().includes('store')) {
                                    type = 'store';
                                }

                                allPoints.push({
                                    id: placeId,
                                    name: res.name || 'Safe Point',
                                    location: res.geometry?.location?.toJSON() || point,
                                    type: type
                                });
                            }
                        });
                    }
                    resolve();
                });
            });
        });

        await Promise.all(searchPromises);

        // Precise Counts
        const pCount = allPoints.filter(p => p.type === 'police').length;
        const hCount = allPoints.filter(p => p.type === 'hospital').length;
        const sCount = allPoints.filter(p => p.type === 'store').length;
        const bCount = allPoints.filter(p => p.type === 'building').length; // Calculate building count

        // Composite Score Calculation - prioritize stores and police
        const densityScore = Math.min(30, (sCount * 1.5) + (bCount * 0.5)); // Include building count in density score
        const rawSafetyScore = 40 + densityScore + policeBonus + hospitalBonus;
        const finalSafetyScore = Math.min(100, Math.max(50, rawSafetyScore));

        return {
            businessCount: allPoints.length,
            midpoint: midpoint,
            points: allPoints.slice(0, 25), // Increased limit for more samples
            safetyScore: finalSafetyScore,
            policeCount: pCount,
            hospitalCount: hCount,
            storeCount: sCount,
            buildingCount: bCount // Return building count
        };

    } catch (error: any) {
        console.error("Error in precision safety analysis:", error);
        return {
            businessCount: 0,
            midpoint: { lat: 0, lng: 0 },
            points: [],
            safetyScore: 50,
            policeCount: 0,
            hospitalCount: 0,
            storeCount: 0,
            buildingCount: 0, // Return building count in error state
            error: error.message
        };
    }
};
