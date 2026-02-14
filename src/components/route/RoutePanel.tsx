import React from "react";
import { RouteCard } from "./RouteCard";

export interface RouteOption {
    id: string;
    title: "Safest" | "Neutral" | "Shortest";
    score: number;
    distance: string;
    duration: string;
}

interface RoutePanelProps {
    routes: RouteOption[];
    selectedRouteIndex: number;
    onRouteSelect: (index: number) => void;
}

export const RoutePanel: React.FC<RoutePanelProps> = ({
    routes,
    selectedRouteIndex,
    onRouteSelect,
}) => {
    return (
        <div className="space-y-4">
            {routes.map((route, index) => (
                <RouteCard
                    key={route.id}
                    title={route.title}
                    score={route.score}
                    distance={route.distance}
                    duration={route.duration}
                    isSelected={index === selectedRouteIndex}
                    onClick={() => onRouteSelect(index)}
                />
            ))}
        </div>
    );
};
