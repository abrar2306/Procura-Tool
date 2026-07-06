export const PROCUREMENT_TYPES = [
    { id: "software", label: "Software Procurement", desc: "Licenses, SaaS, cloud services, professional services" },
    { id: "hardware", label: "Hardware Procurement", desc: "Servers, networking, endpoint devices, hardware support" },
];

export const CATEGORIES = {
    software: [
        { id: "license_sku", label: "License / SKU Procurement", workflow: "form" },
        { id: "services", label: "Services", workflow: "documents" },
    ],
    hardware: [
        { id: "hardware_product", label: "Hardware Product", workflow: "form" },
        { id: "hardware_support", label: "Hardware Support", workflow: "documents" },
    ],
};

export const CATEGORY_LABELS = Object.values(CATEGORIES).flat().reduce((acc, c) => {
    acc[c.id] = c.label;
    return acc;
}, {});

export const findCategory = (type, id) => (CATEGORIES[type] || []).find((c) => c.id === id);
