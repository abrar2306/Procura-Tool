import React from "react";
import { Lightning, Globe, ClockCounterClockwise } from "@phosphor-icons/react";

export default function SearchModeToggle({ deepSearch, setDeepSearch, lastCachedAt }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Globe size={16} className="text-blue-600" />
                        Market Price Search
                    </h3>
                    {lastCachedAt && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <ClockCounterClockwise size={12} />
                            Last cached: {new Date(lastCachedAt).toLocaleString()}
                        </p>
                    )}
                </div>
                
                <div className="flex bg-slate-200/50 p-1 rounded-lg self-start sm:self-auto shrink-0">
                    <button
                        onClick={() => setDeepSearch(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            !deepSearch 
                                ? "bg-white text-slate-900 shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                        <Lightning size={16} weight={!deepSearch ? "fill" : "regular"} className={!deepSearch ? "text-amber-500" : ""} />
                        Quick Search
                    </button>
                    <button
                        onClick={() => setDeepSearch(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            deepSearch 
                                ? "bg-white text-slate-900 shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                        <Globe size={16} weight={deepSearch ? "fill" : "regular"} className={deepSearch ? "text-blue-600" : ""} />
                        Deep Search
                    </button>
                </div>
            </div>
            
            {deepSearch && (
                <div className="mt-3 text-xs text-slate-500 bg-blue-50/50 border border-blue-100 rounded p-2.5 flex items-start gap-2">
                    <div className="text-blue-600 shrink-0 mt-0.5">ℹ️</div>
                    <p>Deep Search will perform a live crawl of vendor websites to find the most up-to-date pricing. This process may take 15-30 seconds depending on the number of items.</p>
                </div>
            )}
        </div>
    );
}
