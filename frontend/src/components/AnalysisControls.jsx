import React, { useEffect, useState, useCallback } from "react";
import { Lightning, Database, MagnifyingGlass, CheckCircle, Clock, Warning, X, ArrowRight, Spinner } from "@phosphor-icons/react";
import { getCacheStatus } from "../lib/api";
import { formatProductName } from "../lib/formatProductName";

/**
 * AnalysisControls
 *
 * Replaces the old SearchModeToggle. Shows:
 *  1. Cache status badges for each hardware item (cached / not cached).
 *  2. A toggle between Quick Search (cache) and Deep Search (live crawl).
 *  3. A professional dialog when the user tries Quick Search with no cached data.
 */
export default function AnalysisControls({ reviewId, deepSearch, setDeepSearch, onRunAnalysis, analyzing }) {
    const [cacheStatus, setCacheStatus] = useState(null);   // null = loading
    const [loadingCache, setLoadingCache] = useState(true);
    const [showNoCache, setShowNoCache] = useState(false);  // "no cache" dialog

    const fetchCache = useCallback(async () => {
        if (!reviewId) return;
        setLoadingCache(true);
        try {
            const status = await getCacheStatus(reviewId);
            setCacheStatus(status);
        } catch {
            setCacheStatus(null);
        } finally {
            setLoadingCache(false);
        }
    }, [reviewId]);

    useEffect(() => { fetchCache(); }, [fetchCache]);

    // Intercept "Run Analysis" when quick-search has no cache
    const handleRun = () => {
        if (!deepSearch && cacheStatus && !cacheStatus.any_cached) {
            setShowNoCache(true);
            return;
        }
        onRunAnalysis();
    };

    const proceedWithDeep = () => {
        setDeepSearch(true);
        setShowNoCache(false);
        // small delay so state propagates before parent runs
        setTimeout(onRunAnalysis, 50);
    };

    const cachedCount   = cacheStatus?.cached_count ?? 0;
    const totalItems    = cacheStatus?.total_hardware_items ?? 0;
    const allCached     = cacheStatus?.all_cached ?? false;
    const anyCached     = cacheStatus?.any_cached ?? false;

    return (
        <>
            {/* ── Main control card ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MagnifyingGlass size={18} weight="duotone" className="text-slate-600" />
                        <span className="font-heading font-semibold text-slate-900 text-sm">Market Price Search</span>
                    </div>
                    {/* Cache badge */}
                    {!loadingCache && cacheStatus && (
                        <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                            allCached
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : anyCached
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                            {allCached
                                ? <><CheckCircle size={12} weight="fill" /> All {totalItems} items cached</>
                                : anyCached
                                    ? <><Clock size={12} weight="fill" /> {cachedCount} of {totalItems} cached</>
                                    : <><Warning size={12} weight="fill" /> No cache available</>
                            }
                        </div>
                    )}
                    {loadingCache && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 px-2.5 py-1">
                            <Spinner size={12} className="animate-spin" /> Checking cache…
                        </div>
                    )}
                </div>

                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Quick Search */}
                    <button
                        onClick={() => setDeepSearch(false)}
                        className={`relative flex flex-col gap-1.5 p-4 rounded-lg border-2 text-left transition-all ${
                            !deepSearch
                                ? "border-blue-500 bg-blue-50/60"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Database size={16} weight="duotone" className={!deepSearch ? "text-blue-600" : "text-slate-400"} />
                                <span className={`text-sm font-semibold ${!deepSearch ? "text-blue-700" : "text-slate-700"}`}>
                                    Quick Search
                                </span>
                            </div>
                            {!deepSearch && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Uses locally cached pricing data from previous searches. Instant results.
                        </p>
                        {!loadingCache && !anyCached && (
                            <div className="mt-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                No cached data — will prompt to switch
                            </div>
                        )}
                    </button>

                    {/* Deep Search */}
                    <button
                        onClick={() => setDeepSearch(true)}
                        className={`relative flex flex-col gap-1.5 p-4 rounded-lg border-2 text-left transition-all ${
                            deepSearch
                                ? "border-violet-500 bg-violet-50/60"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lightning size={16} weight="duotone" className={deepSearch ? "text-violet-600" : "text-slate-400"} />
                                <span className={`text-sm font-semibold ${deepSearch ? "text-violet-700" : "text-slate-700"}`}>
                                    Deep Search
                                </span>
                            </div>
                            {deepSearch && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Live crawl of CDW, ITPrice &amp; Router-Switch. Most accurate, takes ~30–60 s.
                        </p>
                    </button>
                </div>

                {/* Per-item cache status list */}
                {!loadingCache && cacheStatus && cacheStatus.items.length > 0 && (
                    <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden">
                        {cacheStatus.items.map((item) => (
                            <div key={item.item_id} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50/60 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-slate-800 truncate">
                                        {formatProductName(item.description) || "Unknown Item"}
                                    </div>
                                    {item.sku && (
                                        <div className="text-[10px] font-mono-data text-slate-400 mt-0.5">{item.sku}</div>
                                    )}
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    {item.cached ? (
                                        <>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                <CheckCircle size={10} weight="fill" /> Cached
                                            </span>
                                            {item.cached_price && (
                                                <span className="text-[11px] font-mono-data text-slate-500">
                                                    ${item.cached_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                            <Clock size={10} /> Not cached
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Run button */}
                <button
                    onClick={handleRun}
                    disabled={analyzing}
                    className={`w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg transition-all ${
                        deepSearch
                            ? "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-slate-200 disabled:text-slate-400"
                            : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400"
                    }`}
                >
                    {analyzing ? (
                        <><Spinner size={16} className="animate-spin" /> {deepSearch ? "Running deep search…" : "Analyzing…"}</>
                    ) : (
                        <>{deepSearch ? <Lightning size={16} weight="fill" /> : <Database size={16} weight="duotone" />}
                        {deepSearch ? "Run Deep Search" : "Run Quick Search"}</>
                    )}
                </button>
            </div>

            {/* ── No-cache confirmation dialog ── */}
            {showNoCache && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-7 animate-step">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-5">
                            <Database size={24} weight="duotone" className="text-amber-500" />
                        </div>

                        {/* Title & body */}
                        <h2 className="font-heading font-bold text-slate-900 text-lg mb-2">
                            No Cached Pricing Data Found
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed mb-1">
                            Quick Search relies on previously cached market prices for your hardware items.
                            No pricing data has been cached for this proposal yet.
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                            Would you like to run a <strong className="text-violet-700">Deep Search</strong> instead?
                            This will crawl CDW, ITPrice, and Router-Switch in real time to retrieve the latest pricing
                            data, and the results will be cached automatically for future use.
                        </p>

                        {/* Stats */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 text-xs text-slate-500">
                            <div className="flex items-center justify-between">
                                <span>Items requiring pricing</span>
                                <span className="font-semibold text-slate-700">{totalItems}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span>Estimated duration</span>
                                <span className="font-semibold text-slate-700">30 – 60 seconds</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setShowNoCache(false)}
                                className="flex-1 border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 py-2.5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={proceedWithDeep}
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                            >
                                <Lightning size={16} weight="fill" /> Run Deep Search
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
