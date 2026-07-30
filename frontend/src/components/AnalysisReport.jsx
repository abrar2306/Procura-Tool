import React from "react";
import { CheckCircle, Warning, FileText, Info } from "@phosphor-icons/react";

const getVerdictColors = (recommendation) => {
    switch (recommendation) {
        case "COMMERCIALLY_FAVORABLE": return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
        case "NEGOTIATE": return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
        case "REVIEW_REQUIRED": return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
        case "ESCALATE": return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
        default: return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
    }
};

export default function AnalysisReport({ analysis: data }) {
    if (!data) return null;
    
    // The new MVP deterministic score structure:
    const recommendation = data.recommendation || "UNKNOWN";
    const overallScore = data.overall_score || data.overall_procurement_score || 0;
    const summary = data.summary || "No executive summary provided.";
    const breakdown = data.score_breakdown || {};
    
    const colors = getVerdictColors(recommendation);

    return (
        <div className="space-y-6">
            {/* Header Verdict Card */}
            <div className={`p-6 rounded-lg border ${colors.bg} ${colors.border}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className={`text-[10px] uppercase tracking-widest font-semibold ${colors.text} mb-2`}>
                            Deterministic AI Verdict
                        </div>
                        <h2 className="text-3xl font-heading font-bold text-slate-900 capitalize">
                            {recommendation.replace(/_/g, " ").toLowerCase()}
                        </h2>
                        <div className="text-slate-700 mt-4 leading-relaxed max-w-3xl whitespace-pre-line">
                            {summary}
                        </div>
                    </div>
                    <div className="shrink-0 bg-white rounded-lg p-5 border border-slate-200 shadow-sm min-w-48 text-center">
                        <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Overall Score</div>
                        <div className="text-4xl font-heading font-bold text-slate-900 font-mono-data">
                            {overallScore}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">out of 100</div>
                    </div>
                </div>
            </div>

            {/* Score Breakdown Component */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4">Score Breakdown</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 border border-slate-100 rounded bg-slate-50">
                            <div className="capitalize text-sm font-medium text-slate-700">{key.replace(/_/g, " ")}</div>
                            <div className="font-mono-data font-semibold text-slate-900 text-sm">
                                {value.score} <span className="text-slate-400 text-xs font-normal">/ {value.maximum}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Warnings and Issues */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Warning size={18} className="text-amber-500" /> Warnings & Flags
                </h3>
                <div className="text-sm text-slate-600">
                    {data.flags && data.flags.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-rose-600">
                            {data.flags.map((flag, idx) => (
                                <li key={idx}>{flag}</li>
                            ))}
                        </ul>
                    ) : (
                        "No warnings identified."
                    )}
                </div>
            </div>

            {/* Line Items & Volume Discounts */}
            {data.items && data.items.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-heading font-semibold text-slate-900">Line Items & Benchmarks</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {data.items.map((item, idx) => (
                            <div key={idx} className="p-6 flex flex-col md:flex-row gap-4 justify-between items-start">
                                <div>
                                    <div className="font-medium text-slate-900">
                                        {item.extracted_item?.name || item.extracted_item?.role || "Unknown Item"}
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                        Qty: {item.extracted_item?.quantity || "—"} {item.extracted_item?.unit ? `(${item.extracted_item.unit})` : ""}
                                    </div>
                                    {item.benchmark_match?.applied_discount > 0 && (
                                        <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                            Volume discount applied: {item.benchmark_match.applied_discount}% off
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-slate-900">
                                        {item.extracted_item?.currency || "$"} {item.extracted_item?.unit_price?.toLocaleString() || "—"} / unit
                                    </div>
                                    {item.benchmark_match?.match_status === "MATCHED" && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Benchmark: {item.benchmark_match.currency || "$"} {item.benchmark_match.benchmark_median?.toLocaleString() || "—"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
