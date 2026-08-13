import React from "react";
import { Globe, Plus } from "@phosphor-icons/react";

export default function SourcePills({ sources = [], onClick }) {
    if (!sources || sources.length === 0) return null;

    // Show up to 2 sources, then a +N pill
    const displaySources = sources.slice(0, 2);
    const extraCount = sources.length - 2;

    return (
        <div 
            className="flex flex-wrap items-center gap-1.5 cursor-pointer group"
            onClick={onClick}
            title="View source details"
        >
            {displaySources.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border border-slate-200">
                    <Globe size={10} weight="bold" />
                    <span>{s.source_name || "Web"}</span>
                </div>
            ))}
            {extraCount > 0 && (
                <div className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-blue-100">
                    <Plus size={8} weight="bold" />
                    <span>{extraCount}</span>
                </div>
            )}
        </div>
    );
}
