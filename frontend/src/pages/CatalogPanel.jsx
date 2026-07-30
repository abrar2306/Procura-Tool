import React, { useEffect, useRef, useState } from "react";
import { listCatalog, importCatalog, deleteCatalogRow } from "../lib/api";
import { toast } from "sonner";
import { Upload, Trash, DownloadSimple, Package, Cube } from "@phosphor-icons/react";

const KIND_META = {
    software: { icon: Package, label: "Software SKU / License", desc: "Historical software license procurements — used to benchmark new SKU/subscription quotes" },
    hardware: { icon: Cube, label: "Hardware", desc: "Historical hardware procurements — used to benchmark new hardware quotes" },
};

export default function CatalogPanel({ kind }) {
    const [data, setData] = useState({ columns: [], rows: [] });
    const [loading, setLoading] = useState(true);
    const fileRef = useRef(null);
    const meta = KIND_META[kind];

    const [error, setError] = useState(false);
    const load = React.useCallback(() => { listCatalog(kind).then((d) => { setData(d); setLoading(false); setError(false); }).catch(() => { setError(true); setLoading(false); }); }, [kind]);
    useEffect(() => { setLoading(true); load(); }, [kind, load]);

    const onImport = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
            const r = await importCatalog(kind, f);
            toast.success(`Imported ${r.imported} rows into ${kind} benchmarks`);
            load();
        } catch (err) {
            if (!err.response) {
                toast.error("Import failed: " + err.message);
            }
        }
        e.target.value = "";
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this row?")) return;
        await deleteCatalogRow(kind, id);
        toast.success("Removed");
        load();
    };

    const dlTemplate = () => {
        window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/catalog/${kind}/template`;
    };

    const Icon = meta.icon;

    return (
        <div className="animate-step">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 text-slate-900">
                        <Icon size={20} weight="duotone" className="text-blue-600" />
                        <div className="font-heading font-semibold">{meta.label} benchmarks</div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">{meta.desc}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={dlTemplate} data-testid={`${kind}-template-btn`} className="inline-flex items-center gap-2 text-sm border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-md">
                        <DownloadSimple size={14} /> Excel Template
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={onImport} className="hidden" data-testid={`${kind}-import-input`} />
                    <button onClick={() => fileRef.current?.click()} data-testid={`${kind}-import-btn`} className="inline-flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-md">
                        <Upload size={14} /> Upload Excel
                    </button>
                </div>
            </div>

            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {data.columns.map((c) => (
                                    <th key={c} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">{c.replace(/_/g, " ")}</th>
                                ))}
                                <th className="px-4 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={data.columns.length + 1} className="px-4 py-8 text-center text-slate-400 text-sm">Loading…</td></tr>
                            ) : error ? (
                                <tr><td colSpan={data.columns.length + 1} className="px-4 py-8 text-center text-rose-500 text-sm">Failed to load {meta.label} benchmarks.</td></tr>
                            ) : data.rows.length === 0 ? (
                                <tr><td colSpan={data.columns.length + 1} className="px-4 py-10 text-center">
                                    <div className="text-slate-500 text-sm">No {kind} benchmark records yet.</div>
                                    <div className="text-xs text-slate-400 mt-1">Download the template, fill in your historical procurements, and upload.</div>
                                </td></tr>
                            ) : data.rows.map((r) => (
                                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    {data.columns.map((c) => (
                                        <td key={c} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                                            {c === "volume_tiers" && Array.isArray(r[c]) ? (
                                                <div className="flex gap-1">
                                                    {r[c].map((tier, idx) => (
                                                        <span key={idx} className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-green-200">
                                                            {tier.min_quantity}-{tier.max_quantity || "∞"}: {tier.discount_percentage}% off
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                r[c] ?? "—"
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={() => remove(r.id)} className="text-slate-400 hover:text-rose-600 p-1.5" data-testid={`delete-catalog-${r.id}`}>
                                            <Trash size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data.rows.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
                        {data.rows.length} record{data.rows.length !== 1 ? "s" : ""} — used automatically when analyzing matching procurements
                    </div>
                )}
            </div>
        </div>
    );
}
