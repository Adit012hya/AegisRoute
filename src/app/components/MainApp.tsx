import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Shield, AlertCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EmergencyModal } from "./EmergencyModal";
import { SettingsModal, EmergencyContact } from "./SettingsModal";
import MapView from "../../components/map/MapView";
import { fetchRoutes, RouteData } from "../../services/googleDirections";
import { getMidpoint } from "../../services/businessDensity";
import { RoutePanel, RouteOption } from "../../components/route/RoutePanel";
import { Users, Phone, AlertTriangle } from "lucide-react";
import { useLoadScript, Libraries } from "@react-google-maps/api";

const libraries: Libraries = ["places", "geometry"];

export function MainApp() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (apiKey) {
      console.log("Google Maps API Key Loaded (last 4):", apiKey.slice(-4));
    } else {
      console.error("NO GOOGLE MAPS API KEY FOUND IN ENV");
    }
  }, [apiKey]);

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps Script Load Error:", loadError);
      setError(`Map Script Error: ${loadError.message}`);
    }
  }, [loadError]);

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [sourcePlaceId, setSourcePlaceId] = useState("");
  const [destinationPlaceId, setDestinationPlaceId] = useState("");
  const [sourcePredictions, setSourcePredictions] = useState<any[]>([]);
  const [destPredictions, setDestPredictions] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<"source" | "destination" | null>(null);

  const sessionToken = useRef<any>(null);

  useEffect(() => {
    if (isLoaded && !sessionToken.current) {
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  const fetchPredictions = useCallback(async (input: string, type: "source" | "destination") => {
    if (!input || !isLoaded) {
      if (type === "source") setSourcePredictions([]);
      else setDestPredictions([]);
      return;
    }

    console.log(`Fetching new predictions for ${type}: "${input}"`);
    try {
      // @ts-ignore
      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionToken.current,
        includedRegionCodes: ["IN"], // Focus results on India for better relevance
      });

      if (suggestions) {
        console.log(`Autocomplete ${type} suggestions raw:`, suggestions);
        if (type === "source") setSourcePredictions(suggestions);
        else setDestPredictions(suggestions);
        setError(null);
      }
    } catch (err: any) {
      console.error(`Autocomplete ${type} failed:`, err);
      if (type === "source") setSourcePredictions([]);
      else setDestPredictions([]);

      if (err.message?.includes("Denied")) {
        setError("Places API (New) Denied. Please ensure both 'Places API' and 'Places API (New)' are enabled.");
      }
    }
  }, [isLoaded]);


  // Debounced effect for predictions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeInput === "source") fetchPredictions(source, "source");
    }, 200);
    return () => clearTimeout(timer);
  }, [source, activeInput, fetchPredictions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeInput === "destination") fetchPredictions(destination, "destination");
    }, 200);
    return () => clearTimeout(timer);
  }, [destination, activeInput, fetchPredictions]);

  const [routes, setRoutes] = useState<(RouteOption & {
    businessCount: number,
    midpoint: google.maps.LatLngLiteral,
    safetyPoints: any[],
    distanceValue: number,
    policeCount: number,
    hospitalCount: number,
    storeCount: number,
    buildingCount: number
  })[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rawRoutes, setRawRoutes] = useState<RouteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contacts from localStorage or defaults.
  // Stored contacts may have their `icon` serialized by JSON; restore sensible Lucide icons here.
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    const saved = localStorage.getItem("emergency_contacts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as EmergencyContact[];
        const restoreIcon = (c: any) => {
          const n = String(c?.name || "").toLowerCase();
          if (n.includes("emergency")) return AlertTriangle;
          if (n.includes("police") || n.includes("helpline")) return Phone;
          if (n.includes("friend") || n.includes("family")) return Users;
          return Phone;
        };

        return parsed.map((p) => ({
          ...p,
          icon: typeof p?.icon === "function" || typeof p?.icon === "object" && (p.icon as any)?.$$typeof ? p.icon : restoreIcon(p),
        }));
      } catch (e) {
        console.error("Failed to parse emergency contacts from storage:", e);
      }
    }

    return [
      { id: "1", name: "Emergency Services", number: "+91 8129791660", icon: AlertTriangle, color: "#ef4444", isPrimary: true },
      { id: "2", name: "Police", number: "+91 8129791660", icon: Phone, color: "#ef4444" },
      { id: "3", name: "Women Helpline", number: "+91 8129791660", icon: Phone, color: "#ef4444" },
      { id: "4", name: "Friend/Family", number: "+91 8129791660", icon: Users, color: "#3b82f6" },
    ];
  });

  const handleUpdateContacts = (newContacts: EmergencyContact[]) => {
    setEmergencyContacts(newContacts);
    localStorage.setItem("emergency_contacts", JSON.stringify(newContacts));
  };

  const handleSearch = async () => {
    if (!source || !destination) return;
    setIsLoading(true);
    setError(null);

    console.log("Handle search invoked with:", { source, destination, sourcePlaceId, destinationPlaceId });

    // Fallback logic: if no placeId is selected but we have predictions, use the first one
    let finalSourceId = sourcePlaceId;
    let finalDestId = destinationPlaceId;

    if (!finalSourceId && sourcePredictions.length > 0) {
      finalSourceId = sourcePredictions[0].placePrediction?.placeId;
      console.log("Auto-selected source Place ID:", finalSourceId);
    }
    if (!finalDestId && destPredictions.length > 0) {
      finalDestId = destPredictions[0].placePrediction?.placeId;
      console.log("Auto-selected destination Place ID:", finalDestId);
    }

    try {
      const originParam = finalSourceId ? { placeId: finalSourceId } : source;
      const destinationParam = finalDestId ? { placeId: finalDestId } : destination;

      console.log("Fetching routes with params:", { originParam, destinationParam });
      const result = await fetchRoutes(originParam, destinationParam);

      if (result.error) {
        console.error("Fetch routes error:", result.error);
        setError(result.error);
        setIsLoading(false);
        return;
      }

      const processedRoutes: (RouteOption & {
        businessCount: number,
        midpoint: google.maps.LatLngLiteral,
        safetyPoints: any[],
        distanceValue: number,
        policeCount: number,
        hospitalCount: number,
        storeCount: number,
        buildingCount: number
      })[] = [];
      const raw: RouteData[] = result.routes;

      for (let i = 0; i < raw.length; i++) {
        const route = raw[i];

        // Perform Advanced Safety Analysis
        const densityResult = await getMidpoint({ overview_polyline: route.overview_polyline });

        processedRoutes.push({
          id: `route-${i}`,
          title: "Neutral", // Initial fallback
          score: densityResult.safetyScore,
          distance: route.distance.text,
          distanceValue: route.distance.value,
          duration: route.duration.text,
          businessCount: densityResult.businessCount,
          midpoint: densityResult.midpoint,
          safetyPoints: densityResult.points,
          policeCount: densityResult.policeCount,
          hospitalCount: densityResult.hospitalCount,
          storeCount: densityResult.storeCount,
          buildingCount: densityResult.buildingCount
        } as any);
      }

      // Refined Sorting and Label Logic
      let finalRoutes: any[] = [];

      if (processedRoutes.length > 0) {
        // 1. Identify the Safest (highest score). If tie, shortest one wins.
        const sortedBySafety = [...processedRoutes].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.distanceValue - b.distanceValue;
        });
        const safest = sortedBySafety[0];
        safest.title = "Safest";
        finalRoutes.push(safest);

        // 2. Identify the Shortest (minimum distance)
        const sortedByDistance = [...processedRoutes].sort((a, b) => a.distanceValue - b.distanceValue);
        const absoluteShortest = sortedByDistance[0];

        // Only add as "Shortest" if it is NOT the one already marked as "Safest"
        if (absoluteShortest.id !== safest.id) {
          absoluteShortest.title = "Shortest";
          finalRoutes.push(absoluteShortest);
        }

        // 3. Find one "Neutral" route that isn't Safest or Shortest
        const neutralAlternative = processedRoutes.find(r =>
          r.id !== safest.id && r.id !== absoluteShortest.id
        );

        if (neutralAlternative) {
          neutralAlternative.title = "Neutral";
          finalRoutes.push(neutralAlternative);
        }
      }

      // Important: Prune rawRoutes to match finalRoutes to keep selection indices consistent
      const filteredRaw = finalRoutes.map(fr => {
        const index = parseInt(fr.id.split('-')[1]);
        return raw[index];
      });

      setRoutes(finalRoutes as any);
      setRawRoutes(filteredRaw);
      setSelectedRouteIndex(0);
    } catch (error: any) {
      console.error("Search failed deeply:", error);
      setError(`Critical Failure: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRawRoute = rawRoutes[selectedRouteIndex];
  const selectedRouteData = routes[selectedRouteIndex];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Navbar */}
      <nav className="relative z-20 px-6 py-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
            <Shield className="size-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">AegisRoute</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/50 rounded-lg border border-slate-700/50"
          >
            Settings
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map Section - Flexible */}
        <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
          <div className="absolute inset-0">
            <MapView
              center={selectedRawRoute?.path[0] || { lat: 20.5937, lng: 78.9629 }}
              routePath={selectedRawRoute?.path}
              fitBounds={selectedRawRoute?.bounds}
              businessCount={selectedRouteData?.businessCount}
              midpoint={selectedRouteData?.midpoint}
              safetyPoints={selectedRouteData?.safetyPoints}
              isLoadedExternally={isLoaded}
            />
          </div>

          {/* Floating SOS Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEmergency(true)}
            className="absolute bottom-8 right-8 size-16 rounded-full text-white font-bold shadow-2xl z-10 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
              boxShadow: "0 8px 32px rgba(239, 68, 68, 0.4)",
            }}
          >
            <AlertCircle className="size-8" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Right Panel - Fixed Sidebar Width */}
        <aside
          className="lg:w-[400px] border-l border-slate-800/50 overflow-y-auto flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          }}
        >
          <div className="p-6 space-y-6">
            {/* Search Section */}
            <div className="space-y-3 relative">
              <div className="relative">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                  <div className="size-2.5 rounded-full bg-blue-500" />
                  <input
                    type="text"
                    placeholder="Your location"
                    value={source}
                    onFocus={() => setActiveInput("source")}
                    onChange={(e) => setSource(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>
                {activeInput === "source" && sourcePredictions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-y-auto max-h-60 backdrop-blur-md">
                    {sourcePredictions.map((s, idx) => {
                      const p = s.placePrediction;
                      if (!p) return null;
                      return (
                        <button
                          key={p.placeId || idx}
                          onClick={() => {
                            const fullDescription = p.text?.text || p.mainText?.text || "";
                            console.log("Selected source placeId:", p.placeId);
                            setSource(fullDescription);
                            setSourcePlaceId(p.placeId);
                            setSourcePredictions([]);
                            setActiveInput(null);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-800/80 text-sm text-slate-300 transition-colors border-b border-slate-800/50 last:border-0 flex items-center gap-3"
                        >
                          <Search className="size-4 text-slate-500 flex-shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-medium">{p.mainText?.text}</span>
                            <span className="truncate text-[10px] text-slate-500">{p.secondaryText?.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                  <MapPin className="size-3.5 text-red-500" />
                  <input
                    type="text"
                    placeholder="Where to?"
                    value={destination}
                    onFocus={() => setActiveInput("destination")}
                    onChange={(e) => setDestination(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>
                {activeInput === "destination" && destPredictions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-y-auto max-h-60 backdrop-blur-md">
                    {destPredictions.map((s, idx) => {
                      const p = s.placePrediction;
                      if (!p) return null;
                      return (
                        <button
                          key={p.placeId || idx}
                          onClick={() => {
                            const fullDescription = p.text?.text || p.mainText?.text || "";
                            console.log("Selected dest placeId:", p.placeId);
                            setDestination(fullDescription);
                            setDestinationPlaceId(p.placeId);
                            setDestPredictions([]);
                            setActiveInput(null);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-800/80 text-sm text-slate-300 transition-colors border-b border-slate-800/50 last:border-0 flex items-center gap-3"
                        >
                          <Search className="size-4 text-slate-500 flex-shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-medium">{p.mainText?.text}</span>
                            <span className="truncate text-[10px] text-slate-500">{p.secondaryText?.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm text-white font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                }}
              >
                {isLoading ? "Searching..." : "Find Safe Route"}
              </button>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            <div className="h-px bg-slate-800/50" />

            <div>
              <h2 className="text-xl font-bold text-white mb-2">Route Options</h2>
              <p className="text-sm text-slate-400">Choose your preferred route</p>
            </div>

            {/* Route Cards */}
            {routes.length > 0 ? (
              <RoutePanel
                routes={routes}
                selectedRouteIndex={selectedRouteIndex}
                onRouteSelect={setSelectedRouteIndex}
              />
            ) : (
              <div className="text-slate-500 text-center py-10">
                Enter location and destination to see routes.
              </div>
            )}

            {/* Safety Features */}
            <div
              className="rounded-xl p-4 border border-slate-700/50"
              style={{
                background: "rgba(30, 41, 59, 0.3)",
                backdropFilter: "blur(8px)",
              }}
            >
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Shield className="size-4 text-emerald-500" />
                Safety Features
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  Real-time location sharing
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  Emergency contact alerts
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  Safe zones marked
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  24/7 support available
                </li>
              </ul>
            </div>
          </div>
        </aside >
      </div >

      {/* Emergency Modal */}
      <AnimatePresence>
        {
          showEmergency && (
            <EmergencyModal
              onClose={() => setShowEmergency(false)}
              contacts={emergencyContacts}
            />
          )
        }
      </AnimatePresence >

      {/* Settings Modal */}
      <AnimatePresence>
        {
          showSettings && (
            <SettingsModal
              onClose={() => setShowSettings(false)}
              contacts={emergencyContacts}
              onUpdateContacts={handleUpdateContacts}
            />
          )
        }
      </AnimatePresence >
    </div >
  );
}
