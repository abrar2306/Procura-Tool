import React from "react";
import { Field, Section } from "./FormBits";

export default function ExtractedDataEditor({ data, onChange, procurementType }) {
    // data is now an array of ExtractedItem objects
    const items = Array.isArray(data) ? data : [];

    const updateItem = (index, updates) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        onChange(newItems);
    };

    if (items.length === 0) {
        return <div className="text-sm text-slate-500">No items extracted.</div>;
    }

    return (
        <div className="space-y-6">
            {items.map((item, i) => (
                <Section key={item.id || i} title={`Line Item ${i + 1}: ${item.category}`}>
                    <Field 
                        label="Description" 
                        value={item.raw_description || item.normalized_description} 
                        onChange={(v) => updateItem(i, { raw_description: v })} 
                        testid={`ex-desc-${i}`} 
                    />
                    
                    {item.category === "SOFTWARE" || item.category === "HARDWARE" ? (
                        <>
                            <Field label="SKU / Part Number" value={item.sku} onChange={(v) => updateItem(i, { sku: v })} />
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
                </Section>
            ))}
        </div>
    );
}
