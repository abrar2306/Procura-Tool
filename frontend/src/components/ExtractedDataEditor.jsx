import React, { useState } from "react";
import { Field, Select } from "./FormBits";
import { CaretDown, CaretUp, Cube, Users, Database, CurrencyDollar, Tag, Buildings, Trash } from "@phosphor-icons/react";
import { formatProductName } from "../lib/formatProductName";

const CATEGORY_ICONS = {
    SOFTWARE: Database,
    HARDWARE: Cube,
    RESOURCE: Users,
};

export default function ExtractedDataEditor({ data, onChange }) {
    const items = Array.isArray(data) ? data : [];
    const [expandedItem, setExpandedItem] = useState(-1); // No item expanded by default

    const updateItem = (index, updates) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        onChange(newItems);
    };

    const deleteItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    if (items.length === 0) {
        return <div className="text-sm text-slate-500 p-4 border border-slate-200 rounded-lg bg-slate-50">No items extracted.</div>;
    }

    const totalValue = items.reduce((sum, item) => {
        return sum + (item.line_total || ((item.unit_price || 0) * (item.quantity || 1)));
    }, 0);
    const primaryCurrency = items.find(i => i.currency)?.currency || "USD";

    return (
        <div className="space-y-4">
            {/* Summary Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900 text-white shadow-sm">
                <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Extracted Items</div>
                    <div className="text-lg font-bold">{items.length} line items</div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Total Value</div>
                    <div className="text-xl font-bold font-mono-data text-white">
                        {primaryCurrency} {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {items.map((item, i) => {
                const isExpanded = expandedItem === i;
                const Icon = CATEGORY_ICONS[item.category] || Cube;
                
                return (
                    <div key={item.id || i} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm transition-all">
                        {/* Header (Always visible) */}
                        <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedItem(isExpanded ? -1 : i)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-4">
                                <div className="p-2 rounded-md bg-blue-50 text-blue-600 shrink-0">
                                    <Icon size={18} weight="duotone" />
                                </div>
                                <div className="truncate">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.category}</span>
                                        <span className="text-[10px] font-mono-data bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Item {i + 1}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                        {formatProductName(item.normalized_description || item.raw_description) || "Unnamed Item"}
                                    </div>
                                </div>
                            </div>
                            <div className="hidden sm:flex items-center shrink-0 bg-slate-50/80 rounded-lg px-3 py-2 border border-slate-100">
                                <div className="text-right w-10">
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Qty</div>
                                    <div className="text-sm font-medium font-mono-data text-slate-600">
                                        {item.quantity || 1}
                                    </div>
                                </div>
                                <div className="text-slate-300 text-sm font-medium pt-3 w-8 text-center">×</div>
                                <div className="text-right w-28">
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unit Price</div>
                                    <div className="text-sm font-medium font-mono-data text-slate-700 truncate" title={`${item.currency || "$"}${(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                        {item.currency || "$"}{(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="text-slate-300 text-sm font-medium pt-3 w-8 text-center">=</div>
                                <div className="text-right bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200/50 shadow-sm w-36">
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Line Total</div>
                                    <div className="text-base font-bold font-mono-data text-emerald-950 truncate" title={`${item.currency || "$"}${(item.line_total || ((item.unit_price || 0) * (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                        {item.currency || "$"}{(item.line_total || ((item.unit_price || 0) * (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pl-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteItem(i);
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete item"
                                >
                                    <Trash size={18} />
                                </button>
                                <div className="text-slate-400 p-2 hover:bg-slate-50 rounded-md transition-colors">
                                    {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content (Editable form) */}
                        {isExpanded && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                <div className="mb-4">
                                    <Field 
                                        label="Description" 
                                        value={item.raw_description || item.normalized_description} 
                                        onChange={(v) => updateItem(i, { raw_description: v })} 
                                        testid={`ex-desc-${i}`} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {item.category === "SOFTWARE" || item.category === "HARDWARE" ? (
                                        <>
                                            <Field label="SKU / Part No." value={item.sku} onChange={(v) => updateItem(i, { sku: v })} />
                                            <Field label="Manufacturer" value={item.manufacturer} onChange={(v) => updateItem(i, { manufacturer: v })} />
                                        </>
                                    ) : null}

                                    {item.category === "RESOURCE" ? (
                                        <>
                                            <Field label="Role Name" value={item.role_name} onChange={(v) => updateItem(i, { role_name: v })} />
                                            <Field label="Experience (Years)" value={item.experience_years} type="number" onChange={(v) => updateItem(i, { experience_years: v ? parseInt(v) : null })} />
                                            <Field label="Location" value={item.location} onChange={(v) => updateItem(i, { location: v })} />
                                        </>
                                    ) : null}

                                    <Field label="Quantity" value={item.quantity} type="number" onChange={(v) => updateItem(i, { quantity: v ? parseFloat(v) : null })} />
                                    <Field label="Unit Price" value={item.unit_price} type="number" onChange={(v) => updateItem(i, { unit_price: v ? parseFloat(v) : null })} />
                                    <Field label="Line Total" value={item.line_total} type="number" onChange={(v) => updateItem(i, { line_total: v ? parseFloat(v) : null })} />
                                    
                                    <Field label="Currency" value={item.currency} onChange={(v) => updateItem(i, { currency: v })} />
                                    <Field label="Billing Unit" value={item.billing_unit} onChange={(v) => updateItem(i, { billing_unit: v })} />
                                    <Field label="Duration" value={item.duration} type="number" onChange={(v) => updateItem(i, { duration: v ? parseFloat(v) : null })} />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        </div>
    );
}
