import React from "react";
import { Clock, Navigation } from "lucide-react";

interface RouteCardProps {
    title: "Safest" | "Neutral" | "Shortest";
    score: number;
    distance: string;
    duration: string;
    isSelected: boolean;
    onClick: () => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
    title,
    score,
    distance,
    duration,
    isSelected,
    onClick,
}) => {
    // Determine badge color based on score
    const getBadgeColor = (score: number) => {
        if (score >= 90) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
        if (score >= 70) return "bg-amber-500/20 text-amber-400 border-amber-500/50";
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    };

    return (
        <div
            onClick={onClick}
            className={`
        relative p-4 rounded-xl border transition-all cursor-pointer group
        ${isSelected
                    ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/60"
                }
      `}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-white font-bold text-lg">{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(score)}`}>
                            {score}% Safety Score
                        </span>
                    </div>
                </div>
                {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/50 pt-3">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{distance}</span>
                </div>
            </div>
        </div>
    );
};
