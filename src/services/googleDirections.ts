export interface RouteData {
    summary: string;
    distance: {
        text: string;
        value: number;
    };
    duration: {
        text: string;
        value: number;
    };
    overview_polyline: string;
    path: google.maps.LatLngLiteral[];
    bounds?: google.maps.LatLngBounds;
}

export interface FetchRoutesResult {
    routes: RouteData[];
    error?: string;
}

export const fetchRoutes = async (
    origin: google.maps.LatLngLiteral | string | google.maps.Place,
    destination: google.maps.LatLngLiteral | string | google.maps.Place
): Promise<FetchRoutesResult> => {
    console.log("Fetching routes from", origin, "to", destination);
    try {
        if (!window.google || !window.google.maps) {
            console.error("Google Maps API not loaded");
            return { routes: [], error: 'Google Maps API is not loaded' };
        }

        const directionsService = new google.maps.DirectionsService();

        return new Promise((resolve) => {
            directionsService.route({
                origin,
                destination,
                travelMode: google.maps.TravelMode.WALKING,
                provideRouteAlternatives: true,
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    console.log("Directions API Success. Result:", result);
                    // Return up to 3 routes
                    const selectedRoutes = result.routes.slice(0, 3).map((route) => {
                        const leg = route.legs?.[0]; // Safe access to first leg

                        // Use overview_path if available (standard in JS API), otherwise decode
                        const path = route.overview_path
                            ? route.overview_path.map(latLng => latLng.toJSON())
                            : (google.maps.geometry?.encoding?.decodePath(route.overview_polyline)?.map(latLng => latLng.toJSON()) || []);

                        return {
                            summary: route.summary,
                            distance: {
                                text: leg?.distance?.text || '',
                                value: leg?.distance?.value || 0
                            },
                            duration: {
                                text: leg?.duration?.text || '',
                                value: leg?.duration?.value || 0
                            },
                            overview_polyline: route.overview_polyline,
                            path: path,
                            bounds: route.bounds
                        };
                    });

                    resolve({ routes: selectedRoutes });
                } else {
                    console.error("Directions API Error. Status:", status, "Result:", result);
                    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
                    const keySuffix = apiKey ? ` (Key ends in: ${apiKey.slice(-4)})` : " (No Key Found)";

                    let errorMessage = `Directions API Error: ${status}${keySuffix}`;
                    if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
                        errorMessage = `Access Denied for key ${apiKey.slice(-4)}. 🔧 FIX THIS IN CLOUD CONSOLE:
1. Enable 'Directions API' (it is separate from Maps JS API).
2. Enable 'Geocoding API'.
3. Check 'API Restrictions' on your key (ensure it allows Directions API).
4. Check 'Application Restrictions' (ensure localhost is allowed or restrictions are off).
5. Ensure Billing is active for this project.`;
                    } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
                        errorMessage = 'No walking routes found between these locations.';
                    }
                    resolve({ routes: [], error: errorMessage });
                }
            });
        });

    } catch (error: any) {
        console.error("Critical error in fetchRoutes:", error);
        return { routes: [], error: error.message || 'An unexpected error occurred while fetching directions.' };
    }
};
