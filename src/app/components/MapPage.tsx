import MapView from "../../components/map/MapView";

export const MapPage = () => {
    return (
        <div style={{ height: "100vh", width: "100vw" }}>
            <MapView center={{ lat: 37.7749, lng: -122.4194 }} />
        </div>
    );
};
