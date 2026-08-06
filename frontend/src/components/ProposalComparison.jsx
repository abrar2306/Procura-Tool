import React, { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, Plus, Trash, Eye, EyeSlash, CaretDown, CaretRight } from "@phosphor-icons/react";
import UploadZone from "./UploadZone";
import { uploadDocumentsV2, compareProposals } from "../lib/api";
import { computeItemDiff, generateRawDiff } from "../lib/itemMatcher";
import { toast } from "sonner";
import CountUp from "react-countup";

const fmt = (v) => "$" + (v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtPct = (v) => (v > 0 ? "+" : "") + (v || 0).toFixed(1) + "%";

const statusBorder = {
    decreased: "border-l-emerald-500",
    increased: "border-l-rose-500",
    modified: "border-l-amber-500",
    unchanged: "border-l-slate-200",
};

const statusBg = {
    decreased: "bg-emerald-50/40",
    increased: "bg-rose-50/40",
    modified: "bg-amber-50/30",
    unchanged: "",
};

const DeltaBadge = ({ value, pct }) => {
    if (Math.abs(pct) < 0.01) return <span className="text-xs text-slate-400 font-mono">—</span>;
    const isDown = value < 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono ${isDown ? "text-emerald-700" : "text-rose-700"}`}>
            {isDown ? <ArrowDown size={10} weight="bold" /> : <ArrowUp size={10} weight="bold" />}
            {fmt(Math.abs(value))} ({fmtPct(pct)})
        </span>
    );
};

/* ──────── Tier 1: Delta Summary Cards ──────── */
const DeltaSummary = ({ summary }) => {
    const isGreen = summary.delta < 0;
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">V1 Total</div>
                <div className="mt-1 text-xl font-bold font-mono text-slate-500 line-through">
                    <CountUp end={summary.v1_total} prefix="$" separator="," duration={1.2} />
                </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Revised Total</div>
                <div className="mt-1 font-heading text-2xl font-bold text-slate-900">
                    <CountUp end={summary.v2_total} prefix="$" separator="," duration={1.2} />
                </div>
            </div>
            <div className={`border rounded-lg p-4 ${isGreen ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Net Change</div>
                <div className={`mt-1 text-xl font-bold font-mono ${isGreen ? "text-emerald-700" : "text-rose-700"}`}>
                    <CountUp end={summary.delta} prefix={summary.delta > 0 ? "+$" : "-$"} separator="," duration={1.2} formattingFn={(v) => (summary.delta >= 0 ? "+$" : "-$") + Math.abs(v).toLocaleString()} />
                    <span className="text-sm ml-1">({fmtPct(summary.delta_pct)})</span>
                </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Items Changed</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-widest font-bold">
                    {summary.items_decreased > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            <ArrowDown size={8} weight="bold" />{summary.items_decreased} reduced
                        </span>
                    )}
                    {summary.items_increased > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                            <ArrowUp size={8} weight="bold" />{summary.items_increased} increased
                        </span>
                    )}
                    {summary.items_added > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            <Plus size={8} weight="bold" />{summary.items_added} added
                        </span>
                    )}
                    {summary.items_removed > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                            <Trash size={8} weight="bold" />{summary.items_removed} removed
                        </span>
                    )}
                    {summary.items_unchanged > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                            <Minus size={8} weight="bold" />{summary.items_unchanged} same
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ──────── Tier 2: Structured Comparison Table ──────── */
const DEFAULT_SHOW = 10;

const ComparisonTable = ({ diff }) => {
    const [showAll, setShowAll] = useState(false);
    const { matched, addedInV2, removedFromV1 } = diff;

    const allRows = useMemo(() => {
        const rows = [];
        matched.forEach(m => rows.push({ type: "matched", ...m }));
        addedInV2.forEach(a => rows.push({ type: "added", ...a }));
        removedFromV1.forEach(r => rows.push({ type: "removed", ...r }));
        return rows;
    }, [matched, addedInV2, removedFromV1]);

    const visible = showAll ? allRows : allRows.slice(0, DEFAULT_SHOW);

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                            <th className="text-left px-4 py-2.5 w-[30%]">Item</th>
                            <th className="text-right px-3 py-2.5">V1 Qty</th>
                            <th className="text-right px-3 py-2.5">V1 Price</th>
                            <th className="text-right px-3 py-2.5">V1 Total</th>
                            <th className="text-right px-3 py-2.5">Revised Qty</th>
                            <th className="text-right px-3 py-2.5">Revised Price</th>
                            <th className="text-right px-3 py-2.5">Revised Total</th>
                            <th className="text-right px-4 py-2.5 w-[14%]">Δ Change</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visible.map((row, i) => {
                            if (row.type === "matched") {
                                return (
                                    <tr key={`m-${i}`} className={`border-l-3 ${statusBorder[row.status]} ${statusBg[row.status]} transition-colors hover:bg-slate-50/60`}>
                                        <td className="px-4 py-2.5 font-medium text-slate-900 truncate max-w-[250px]" title={row.description}>{row.description}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{row.v1_quantity}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{fmt(row.v1_unit_price)}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{fmt(row.v1_total)}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-900 font-semibold">{row.v2_quantity}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-900 font-semibold">{fmt(row.v2_unit_price)}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-900 font-semibold">{fmt(row.v2_total)}</td>
                                        <td className="px-4 py-2.5 text-right"><DeltaBadge value={row.delta_total} pct={row.delta_pct} /></td>
                                    </tr>
                                );
                            }
                            if (row.type === "added") {
                                return (
                                    <tr key={`a-${i}`} className="border-l-3 border-l-blue-500 bg-blue-50/30 transition-colors hover:bg-blue-50/50">
                                        <td className="px-4 py-2.5 font-medium text-blue-900 truncate max-w-[250px] flex items-center gap-1.5" title={row.description}>
                                            <Plus size={12} weight="bold" className="text-blue-600 shrink-0" />{row.description}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-300">—</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-300">—</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-300">—</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-blue-900 font-semibold">{row.quantity}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-blue-900 font-semibold">{fmt(row.unit_price)}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-blue-900 font-semibold">{fmt(row.total)}</td>
                                        <td className="px-4 py-2.5 text-right text-[10px] uppercase tracking-widest font-bold text-blue-700">New</td>
                                    </tr>
                                );
                            }
                            // removed
                            return (
                                <tr key={`r-${i}`} className="border-l-3 border-l-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-100/50">
                                    <td className="px-4 py-2.5 font-medium text-slate-400 line-through truncate max-w-[250px] flex items-center gap-1.5" title={row.description}>
                                        <Trash size={12} weight="bold" className="text-slate-400 shrink-0" />{row.description}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-400 line-through">{row.quantity}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-400 line-through">{fmt(row.unit_price)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-400 line-through">{fmt(row.total)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">—</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">—</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">—</td>
                                    <td className="px-4 py-2.5 text-right text-[10px] uppercase tracking-widest font-bold text-slate-400">Removed</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {allRows.length > DEFAULT_SHOW && (
                <div className="border-t border-slate-200 px-4 py-2.5 flex justify-center">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
                    >
                        {showAll ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                        {showAll ? `Show Less` : `View All ${allRows.length} Items`}
                    </button>
                </div>
            )}
        </div>
    );
};

/* ──────── Tier 3: Raw Diff View ──────── */
const RawDiffView = ({ diff }) => {
    const [open, setOpen] = useState(false);
    const lines = useMemo(() => generateRawDiff(diff), [diff]);

    const lineStyle = {
        removed: "bg-rose-950/80 text-rose-300",
        added: "bg-emerald-950/70 text-emerald-300",
        unchanged: "text-slate-400",
    };
    const linePrefix = { removed: "−", added: "+", unchanged: " " };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-sm font-medium text-slate-700"
            >
                <span className="flex items-center gap-2">
                    {open ? <EyeSlash size={14} /> : <Eye size={14} />}
                    Raw Diff View
                </span>
                {open ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
            </button>
            {open && (
                <div className="bg-slate-900 p-4 overflow-x-auto max-h-80 overflow-y-auto">
                    <pre className="text-xs font-mono leading-relaxed">
                        {lines.map((line, i) => (
                            <div key={i} className={`px-2 py-0.5 rounded-sm ${lineStyle[line.type] || ""}`}>
                                <span className="opacity-50 select-none mr-2">{linePrefix[line.type]}</span>
                                {line.text}
                            </div>
                        ))}
                    </pre>
                </div>
            )}
        </div>
    );
};

/* ──────── Main Component ──────── */
export default function ProposalComparison({ review, onReviewUpdate }) {
    const [comparing, setComparing] = useState(false);
    const hasV2 = (review.documents_v2 || []).length > 0;
    const hasV2Items = (review.extracted_items_v2 || []).length > 0;

    const diff = useMemo(() => {
        if (review.comparison) {
            return {
                matched: review.comparison.matched_items || [],
                addedInV2: review.comparison.added_in_v2 || [],
                removedFromV1: review.comparison.removed_from_v1 || [],
                summary: review.comparison.summary || {}
            };
        }
        return null;
    }, [review.comparison]);

    const runCompare = async () => {
        setComparing(true);
        toast.info("Comparing original vs revised proposal…");
        try {
            const r = await compareProposals(review.id);
            onReviewUpdate({ ...review, comparison: r });
            toast.success("Comparison saved");
        } catch (e) {
            if (!e.response) {
                toast.error("Comparison failed: " + e.message);
            }
        } finally { setComparing(false); }
    };

    return (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden" data-testid="proposal-comparison-section">
            <div className="p-6 border-b border-slate-200">
                <div className="font-heading font-semibold text-slate-900">Revised Proposal Comparison</div>
                <div className="text-xs text-slate-500 mt-0.5">
                    Upload a revised proposal from the vendor to see improvements over the original.
                </div>
            </div>

            {/* Upload zone */}
            <div className="p-5 border-b border-slate-200">
                <UploadZone
                    reviewId={review.id}
                    compact
                    uploadFn={uploadDocumentsV2}
                    onUploaded={(r) => { onReviewUpdate(r); toast.success("Revised proposal extracted"); }}
                    title={hasV2 ? "Replace revision with a newer document" : "Drop the revised proposal document here"}
                    subtitle="We'll automatically extract line items and compare against the original."
                    submitLabel="Upload & extract"
                    testidPrefix="upload-v2"
                />
                {hasV2 && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                            {review.documents_v2.length} revised document{review.documents_v2.length > 1 ? "s" : ""} uploaded:{" "}
                            <span className="text-slate-700">{review.documents_v2.map((d) => d.filename).join(", ")}</span>
                        </div>
                        {!diff && (
                            <button
                                onClick={runCompare}
                                disabled={comparing || !hasV2Items}
                                title={!hasV2Items ? "Extract revised document first" : ""}
                                data-testid="run-comparison-button"
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-md"
                            >
                                {comparing ? "Comparing…" : "Run comparison"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Three-tier comparison result */}
            {diff && (
                <div className="p-5 space-y-4">
                    {/* Tier 1: Delta Summary Cards */}
                    <DeltaSummary summary={diff.summary} />

                    {/* Tier 2: Structured Comparison Table */}
                    <ComparisonTable diff={diff} />

                    {/* Tier 3: Raw Diff View */}
                    <RawDiffView diff={diff} />

                    {/* Save comparison button */}
                    <div className="flex justify-end">
                        <button
                            onClick={runCompare}
                            disabled={comparing}
                            data-testid="save-comparison-button"
                            className="inline-flex items-center gap-2 text-xs font-medium border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md text-slate-600 transition-colors"
                        >
                            {comparing ? "Saving…" : "Save comparison to database"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
