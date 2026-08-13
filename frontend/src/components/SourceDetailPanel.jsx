import React from "react";
import { X, Globe, LinkBreak, ArrowSquareOut, Hash, Target } from "@phosphor-icons/react";

export default function SourceDetailPanel({ item, sources, isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="font-heading font-semibold text-slate-900">Market Price Sources</h3>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-[300px] truncate">
                            {item?.product_name || item?.raw_description || "Unknown Item"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 text-slate-500 rounded-md transition-colors"
                    >
                        <X size={16} weight="bold" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!sources || sources.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <Globe size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No market sources found for this item.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sources.map((src, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-white hover:border-blue-200 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Globe size={14} weight="duotone" />
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">{src.source_name || "Web"}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono-data font-bold text-slate-900">
                                                {src.currency || "USD"} {src.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">Unit Price</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-xs mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            {src.match_type === "exact" ? (
                                                <Target size={14} className="text-emerald-500" />
                                            ) : (
                                                <Hash size={14} className="text-amber-500" />
                                            )}
                                            <span>{src.match_type === "exact" ? "Exact Match" : "Close Match"}</span>
                                        </div>
                                        
                                        {src.source_url ? (
                                            <a 
                                                href={src.source_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 ml-auto font-medium"
                                            >
                                                <span>Visit</span>
                                                <ArrowSquareOut size={12} />
                                            </a>
                                        ) : (
                                            <div className="flex items-center gap-1 text-slate-400 ml-auto" title="URL not available">
                                                <LinkBreak size={12} />
                                                <span>No Link</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
