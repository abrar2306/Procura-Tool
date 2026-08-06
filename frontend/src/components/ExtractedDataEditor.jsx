import React, { useState } from "react";
import { Field, Select } from "./FormBits";
import { CaretDown, CaretUp, Cube, Users, Database, CurrencyDollar, Tag, Buildings } from "@phosphor-icons/react";

const CATEGORY_ICONS = {
    SOFTWARE: Database,
    HARDWARE: Cube,
    RESOURCE: Users,
};

export default function ExtractedDataEditor({ data, onChange, procurementType }) {
    const items = Array.isArray(data) ? data : [];
    const [expandedItem, setExpandedItem] = useState(-1); // No item expanded by default

    const updateItem = (index, updates) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
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
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded-md bg-blue-50 text-blue-600 shrink-0">
                                    <Icon size={18} weight="duotone" />
                                </div>
                                <div className="truncate">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.category}</span>
                                        <span className="text-[10px] font-mono-data bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Item {i + 1}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                        {item.normalized_description || item.raw_description || "Unnamed Item"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 pl-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-slate-500">Line Total</div>
                                    <div className="text-sm font-bold font-mono-data text-slate-900">
                                        {item.currency || "$"} {
                                            (item.line_total || ((item.unit_price || 0) * (item.quantity || 1)))
                                                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        }
                                    </div>
                                </div>
                                <div className="text-slate-400">
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
