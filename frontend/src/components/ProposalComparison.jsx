import React, { useState } from "react";
import { ArrowUp, ArrowDown, Minus, CheckCircle, XCircle, Warning, CaretDown, CaretRight } from "@phosphor-icons/react";
import UploadZone from "./UploadZone";
import { uploadDocumentsV2, compareProposals } from "../lib/api";
import { toast } from "sonner";

const verdictBadge = (v) => ({
    "significantly-improved": "bg-emerald-100 text-emerald-800 border-emerald-300",
    improved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    mixed: "bg-amber-50 text-amber-700 border-amber-200",
    worse: "bg-rose-50 text-rose-700 border-rose-200",
    unchanged: "bg-slate-100 text-slate-600 border-slate-200",
}[v] || "bg-slate-100 text-slate-600 border-slate-200");

const impactColor = (i) => ({
    high: "text-rose-700 bg-rose-50 border-rose-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    low: "text-slate-700 bg-slate-100 border-slate-200",
}[i] || "text-slate-700 bg-slate-100 border-slate-200");

const RecIcon = ({ v }) => {
    if (v === "accept-v2") return <CheckCircle size={22} weight="fill" className="text-emerald-600" />;
    if (v === "reject-v2") return <XCircle size={22} weight="fill" className="text-rose-600" />;
    return <Warning size={22} weight="fill" className="text-amber-600" />;
};

const DeltaLine = ({ v1, v2, kind }) => {
    const arrow = kind === "up" ? <ArrowUp size={12} weight="bold" className="text-emerald-600" />
        : kind === "down" ? <ArrowDown size={12} weight="bold" className="text-rose-600" />
        : <Minus size={12} weight="bold" className="text-slate-400" />;
    return (
        <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
            <span className="line-through text-slate-400 font-mono-data">{v1 || "—"}</span>
            {arrow}
            <span className="font-mono-data font-semibold text-slate-900">{v2 || "—"}</span>
        </div>
    );
};

const ItemRow = ({ item, kind }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{item.area}</div>
                    <DeltaLine v1={item.v1_value} v2={item.v2_value} kind={kind === "improvement" ? "up" : kind === "regression" ? "down" : "flat"} />
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border shrink-0 ${impactColor(item.impact)}`}>
                    {item.impact} impact
                </span>
            </div>
            {item.note && (
                <>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold hover:text-slate-900"
                    >
                        {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                        Analyst note
                    </button>
                    {open && <div className="mt-1 text-xs text-slate-600 leading-relaxed">{item.note}</div>}
                </>
            )}
        </div>
    );
};

export default function ProposalComparison({ review, onReviewUpdate }) {
    const [comparing, setComparing] = useState(false);
    const hasV2 = (review.documents_v2 || []).length > 0;
    const comp = review.comparison;

    const runCompare = async () => {
        setComparing(true);
        toast.info("Comparing v1 vs v2 proposal…");
        try {
            const r = await compareProposals(review.id);
            onReviewUpdate(r);
            toast.success("Comparison ready");
        } catch (e) {
            toast.error("Comparison failed: " + (e.response?.data?.detail || e.message));
        } finally { setComparing(false); }
    };

    return (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden" data-testid="proposal-comparison-section">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
                <div className="font-heading font-semibold text-slate-900">Updated proposal (v2) comparison</div>
                <div className="text-xs text-slate-500 mt-0.5">
                    Upload a revised proposal from the vendor to see improvements over v1.
                </div>
            </div>

            {/* Upload zone (always visible, allows replacing) */}
            <div className="p-5 border-b border-slate-200">
                <UploadZone
                    reviewId={review.id}
                    uploadFn={uploadDocumentsV2}
                    onUploaded={(r) => { onReviewUpdate(r); toast.success("v2 extracted"); }}
                    title={hasV2 ? "Replace v2 with a newer version" : "Drop the updated (v2) proposal here"}
                    subtitle="PDF, DOCX, XLSX — the same file types as v1"
                    submitLabel="Upload v2 & extract"
                    compact
                    testidPrefix="upload-v2"
                />
                {hasV2 && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                            {review.documents_v2.length} v2 document{review.documents_v2.length > 1 ? "s" : ""} uploaded:{" "}
                            <span className="text-slate-700">{review.documents_v2.map((d) => d.filename).join(", ")}</span>
                        </div>
                        <button
                            onClick={runCompare}
                            disabled={comparing}
                            data-testid="run-comparison-button"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-md"
                        >
                            {comparing ? "Comparing…" : comp ? "Re-run comparison" : "Run comparison"}
                        </button>
                    </div>
                )}
            </div>

            {/* Comparison result */}
            {comp && (
                <div className="p-5 space-y-4">
                    {/* Top row: verdict + recommendation + improvement score */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="border border-slate-200 rounded-lg p-4">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Overall verdict</div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold border ${verdictBadge(comp.verdict)}`}>
                                    {(comp.verdict || "").replace(/-/g, " ")}
                                </span>
                            </div>
                            <div className="mt-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Improvement score</div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <div className="text-3xl font-heading font-bold font-mono-data text-slate-900">{comp.improvement_score || 0}</div>
                                    <div className="text-slate-400 text-xs">/ 100</div>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            (comp.improvement_score || 0) >= 65 ? "bg-emerald-500"
                                            : (comp.improvement_score || 0) >= 45 ? "bg-amber-500"
                                            : "bg-rose-500"
                                        }`}
                                        style={{ width: `${comp.improvement_score || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4 md:col-span-2">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Recommendation</div>
                            <div className="mt-2 flex items-center gap-3">
                                <RecIcon v={comp.final_recommendation} />
                                <div className="text-lg font-heading font-bold text-slate-900 capitalize leading-tight">
                                    {(comp.final_recommendation || "—").replace(/-/g, " ")}
                                </div>
                            </div>
                            <div className="text-xs text-slate-600 mt-2 leading-relaxed">{comp.recommendation_summary}</div>
                            {comp.summary && (
                                <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 leading-relaxed">{comp.summary}</div>
                            )}
                        </div>
                    </div>

                    {/* Commercial delta banner */}
                    {comp.commercial_delta && (comp.commercial_delta.v1_total || comp.commercial_delta.v2_total) && (
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Commercial delta</div>
                            <div className="flex items-center gap-6 flex-wrap">
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">v1 total</div>
                                    <div className="font-mono-data text-slate-500 line-through">{comp.commercial_delta.v1_total || "—"}</div>
                                </div>
                                <ArrowDown size={16} weight="bold" className="text-slate-400 rotate-[-90deg]" />
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">v2 total</div>
                                    <div className="font-mono-data font-bold text-slate-900">{comp.commercial_delta.v2_total || "—"}</div>
                                </div>
                                {typeof comp.commercial_delta.delta_pct === "number" && (
                                    <div className="ml-auto">
                                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Change</div>
                                        <div className={`font-mono-data font-bold ${comp.commercial_delta.delta_pct < 0 ? "text-emerald-700" : comp.commercial_delta.delta_pct > 0 ? "text-rose-700" : "text-slate-700"}`}>
                                            {comp.commercial_delta.delta_pct > 0 ? "+" : ""}{comp.commercial_delta.delta_pct}%
                                        </div>
                                    </div>
                                )}
                            </div>
                            {comp.commercial_delta.note && (
                                <div className="text-xs text-slate-600 mt-2 leading-relaxed">{comp.commercial_delta.note}</div>
                            )}
                        </div>
                    )}

                    {/* Improvements */}
                    {comp.improvements?.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                                <ArrowUp size={14} weight="bold" className="text-emerald-700" />
                                <div className="font-heading font-semibold text-emerald-900 text-sm">Improvements ({comp.improvements.length})</div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {comp.improvements.map((it, i) => <ItemRow key={i} item={it} kind="improvement" />)}
                            </div>
                        </div>
                    )}

                    {/* Regressions */}
                    {comp.regressions?.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
                                <ArrowDown size={14} weight="bold" className="text-rose-700" />
                                <div className="font-heading font-semibold text-rose-900 text-sm">Regressions ({comp.regressions.length})</div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {comp.regressions.map((it, i) => <ItemRow key={i} item={it} kind="regression" />)}
                            </div>
                        </div>
                    )}

                    {/* Unchanged key concerns */}
                    {comp.unchanged_key_concerns?.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                <Minus size={14} weight="bold" className="text-slate-500" />
                                <div className="font-heading font-semibold text-slate-800 text-sm">Still unresolved ({comp.unchanged_key_concerns.length})</div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {comp.unchanged_key_concerns.map((it, i) => (
                                    <div key={i} className="px-5 py-3">
                                        <div className="text-sm font-medium text-slate-900">{it.area}</div>
                                        <div className="text-xs text-slate-600 mt-0.5 font-mono-data">{it.current_value || "—"}</div>
                                        {it.why_it_matters && (
                                            <div className="text-xs text-slate-500 mt-1 leading-relaxed">{it.why_it_matters}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SLA delta prose */}
                    {comp.sla_delta_summary && (
                        <div className="border border-slate-200 rounded-lg p-4">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">SLA changes summary</div>
                            <p className="text-sm text-slate-700 leading-relaxed">{comp.sla_delta_summary}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
