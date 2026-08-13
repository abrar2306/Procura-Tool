export const CATEGORIES = [
    {
        id: "hardware",
        backendCategory: "HARDWARE",
        label: "Hardware",
        desc: "Servers, networking gear, end-user devices, peripherals, and support renewals.",
        icon: "Cube",
        workflow: "document",
        enabled: true,
    },
    {
        id: "services",
        backendCategory: "RESOURCE",
        label: "Services",
        desc: "IT consulting, managed services, professional services, and SOW-based engagements.",
        icon: "FileText",
        workflow: "document",
        enabled: false,
    },
    {
        id: "software",
        backendCategory: "SOFTWARE",
        label: "Software",
        desc: "SaaS subscriptions, perpetual licenses, and software maintenance agreements.",
        icon: "Package",
        workflow: "document",
        enabled: false,
    },
];

export const CATEGORY_LABELS = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c.label;
    return acc;
}, {});

export const findCategory = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES.find((c) => c.backendCategory === id);
