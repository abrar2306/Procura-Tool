import React, { useEffect, useRef, useState } from "react";
import { getBenchmarks, upsertBenchmark, deleteBenchmark, setMultiplier, importBenchmarks } from "../lib/api";
import { toast } from "sonner";
import { Database, Upload, Plus, Trash, FloppyDisk, DownloadSimple, Users, Package, Cube } from "@phosphor-icons/react";
import CatalogPanel from "./CatalogPanel";

const sourceBadge = (s) => {
    const map = {
        custom: "bg-blue-50 text-blue-700 border-blue-200",
        default: "bg-slate-100 text-slate-600 border-slate-200",
        "generic-fallback": "bg-amber-50 text-amber-700 border-amber-200",
    };
    return `inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-semibold border ${map[s] || map.default}`;
};

const emptyRow = { role: "", junior: "", mid: "", senior: "", notes: "" };

export default function Benchmarks() {
    const [tab, setTab] = useState("resources");
    const [roles, setRoles] = useState({});
    const [multiplier, setMult] = useState(1.55);
    const [newRow, setNewRow] = useState(emptyRow);
    const fileRef = useRef(null);

    const load = () => getBenchmarks().then((d) => { setRoles(d.roles || {}); setMult(d.vendor_multiplier); });
    useEffect(() => { load(); }, []);

    const save = async (role, patch) => {
        try { await upsertBenchmark({ role, ...patch, source: "custom" }); toast.success(`Saved ${role}`); load(); }
        catch (e) { toast.error(e.message); }
    };
    const remove = async (role) => {
        if (!window.confirm(`Delete "${role}"?`)) return;
        await deleteBenchmark(role); toast.success(`Removed ${role}`); load();
    };
    const addNew = async () => {
        if (!newRow.role.trim()) return toast.error("Role name required");
        await upsertBenchmark({ role: newRow.role.trim(), junior: Number(newRow.junior) || null, mid: Number(newRow.mid) || null, senior: Number(newRow.senior) || null, notes: newRow.notes, source: "custom" });
        toast.success(`Added ${newRow.role}`); setNewRow(emptyRow); load();
    };
    const onImport = async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        try { const r = await importBenchmarks(f); toast.success(`Imported ${r.imported} rows`); load(); }
        catch (err) { toast.error("Import failed: " + (err.response?.data?.detail || err.message)); }
        e.target.value = "";
    };
    const saveMult = async () => { await setMultiplier(Number(multiplier)); toast.success("Multiplier updated"); };
    const downloadTemplate = () => {
        window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/benchmarks/template`;
    };

    const rows = Object.entries(roles).sort(([a], [b]) => a.localeCompare(b));

    const TABS = [
        { id: "resources", label: "Resource Rates", icon: Users },
        { id: "software", label: "Software SKU / License", icon: Package },
        { id: "hardware", label: "Hardware", icon: Cube },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-step">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
                    <Database size={14} /> Benchmark library
                </div>
                <h1 className="font-heading text-3xl font-bold text-slate-900">Procurement benchmarks</h1>
                <p className="text-slate-500 mt-1 max-w-2xl">
                    Upload your historical procurement data. When analyzing a new deal, Procura automatically compares it against your library first, then falls back to general market knowledge only when no match is found.
                </p>
            </div>

            <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
                {TABS.map((t) => {
                    const active = tab === t.id;
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} data-testid={`bm-tab-${t.id}`}
                            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
                            <Icon size={16} weight={active ? "fill" : "regular"} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {tab === "resources" && (
                <div className="animate-step">
                    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                            <div className="font-heading font-semibold text-slate-900">Resource cost rates</div>
                            <p className="text-sm text-slate-500 mt-1 max-w-2xl">Monthly market cost per role & experience level (USD). Your custom values override the seeded defaults.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={downloadTemplate} data-testid="download-template-button" className="inline-flex items-center gap-2 text-sm border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-md">
                                <DownloadSimple size={14} /> Excel Template
                            </button>
                            <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={onImport} className="hidden" data-testid="import-file-input" />
                            <button onClick={() => fileRef.current?.click()} data-testid="import-benchmarks-button" className="inline-flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-md">
                                <Upload size={14} /> Upload Excel
                            </button>
                        </div>
                    </div>

                    <div className="mb-6 border border-slate-200 rounded-lg bg-white p-5 flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[240px]">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Vendor margin multiplier</div>
                            <div className="text-xs text-slate-500 mt-0.5">Fair vendor bill rate = market cost × this multiplier</div>
                        </div>
                        <input type="number" step="0.01" value={multiplier} onChange={(e) => setMult(e.target.value)} className="w-28 px-3 py-2 rounded-md border border-slate-300 text-sm font-mono-data" data-testid="multiplier-input" />
                        <button onClick={saveMult} data-testid="save-multiplier-button" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Save</button>
                    </div>

                    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Role</th>
                                    <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Junior</th>
                                    <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Mid</th>
                                    <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Senior</th>
                                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Source</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(([role, vals]) => (
                                    <BenchmarkRow key={role} role={role} vals={vals} onSave={save} onDelete={remove} />
                                ))}
                                <tr className="bg-slate-50/50 border-t border-slate-200">
                                    <td className="px-4 py-2"><input value={newRow.role} onChange={(e) => setNewRow({ ...newRow, role: e.target.value })} placeholder="New role" className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" data-testid="new-role-input" /></td>
                                    <td className="px-4 py-2"><input type="number" value={newRow.junior} onChange={(e) => setNewRow({ ...newRow, junior: e.target.value })} className="w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-right font-mono-data" data-testid="new-junior-input" /></td>
                                    <td className="px-4 py-2"><input type="number" value={newRow.mid} onChange={(e) => setNewRow({ ...newRow, mid: e.target.value })} className="w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-right font-mono-data" data-testid="new-mid-input" /></td>
                                    <td className="px-4 py-2"><input type="number" value={newRow.senior} onChange={(e) => setNewRow({ ...newRow, senior: e.target.value })} className="w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-right font-mono-data" data-testid="new-senior-input" /></td>
                                    <td className="px-4 py-2"><span className={sourceBadge("custom")}>custom</span></td>
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={addNew} data-testid="add-benchmark-button" className="inline-flex items-center gap-1 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md">
                                            <Plus size={12} /> Add
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === "software" && <CatalogPanel kind="software" />}
            {tab === "hardware" && <CatalogPanel kind="hardware" />}
        </div>
    );
}

function BenchmarkRow({ role, vals, onSave, onDelete }) {
    const [edit, setEdit] = useState({ junior: vals.junior ?? "", mid: vals.mid ?? "", senior: vals.senior ?? "" });
    const dirty = String(edit.junior) !== String(vals.junior ?? "") || String(edit.mid) !== String(vals.mid ?? "") || String(edit.senior) !== String(vals.senior ?? "");
    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50/50">
            <td className="px-4 py-2 font-medium text-slate-900">{role}</td>
            <td className="px-4 py-2 text-right"><input type="number" value={edit.junior} onChange={(e) => setEdit({ ...edit, junior: e.target.value })} className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right font-mono-data" data-testid={`edit-junior-${role}`} /></td>
            <td className="px-4 py-2 text-right"><input type="number" value={edit.mid} onChange={(e) => setEdit({ ...edit, mid: e.target.value })} className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right font-mono-data" data-testid={`edit-mid-${role}`} /></td>
            <td className="px-4 py-2 text-right"><input type="number" value={edit.senior} onChange={(e) => setEdit({ ...edit, senior: e.target.value })} className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right font-mono-data" data-testid={`edit-senior-${role}`} /></td>
            <td className="px-4 py-2"><span className={sourceBadge(vals.source)}>{vals.source}</span></td>
            <td className="px-4 py-2 text-right">
                <div className="inline-flex gap-1">
                    <button
                        onClick={() => onSave(role, { junior: Number(edit.junior) || null, mid: Number(edit.mid) || null, senior: Number(edit.senior) || null })}
                        disabled={!dirty}
                        data-testid={`save-${role}`}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md ${dirty ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                    >
                        <FloppyDisk size={12} /> Save
                    </button>
                    <button onClick={() => onDelete(role)} data-testid={`delete-${role}`} className="text-slate-400 hover:text-rose-600 p-1.5">
                        <Trash size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
