/**
 * Item Matcher Utility
 * 
 * Takes v1 and v2 extracted item arrays and produces a structured diff
 * for the ProposalComparison component.
 */

/**
 * Normalize a description string for matching purposes.
 */
const normalizeDesc = (desc) => (desc || "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Compute the line total for an item, using line_total if available,
 * or falling back to quantity * unit_price.
 */
const getTotal = (item) => {
    const lt = Number(item.line_total);
    if (lt && !isNaN(lt)) return lt;
    const qty = Number(item.quantity) || 1;
    const up = Number(item.unit_price) || 0;
    return qty * up;
};

/**
 * Match v1 items to v2 items by normalized_description.
 * Returns: { matched, addedInV2, removedFromV1, summary }
 */
export function computeItemDiff(v1Items = [], v2Items = []) {
    const matched = [];
    const addedInV2 = [];
    const removedFromV1 = [];

    // Index v2 items by normalized description for fast lookup
    const v2Map = new Map();
    const v2Used = new Set();
    v2Items.forEach((item, idx) => {
        const key = normalizeDesc(item.normalized_description || item.raw_description);
        if (!v2Map.has(key)) {
            v2Map.set(key, { item, idx });
        }
    });

    // Match v1 items to v2 items
    const v1Used = new Set();
    for (const v1 of v1Items) {
        const key = normalizeDesc(v1.normalized_description || v1.raw_description);
        const v2Entry = v2Map.get(key);

        if (v2Entry && !v2Used.has(v2Entry.idx)) {
            v2Used.add(v2Entry.idx);
            v1Used.add(key);
            const v2 = v2Entry.item;

            const v1Total = getTotal(v1);
            const v2Total = getTotal(v2);
            const delta = v2Total - v1Total;
            const deltaPct = v1Total !== 0 ? (delta / v1Total) * 100 : 0;

            let status = "unchanged";
            if (Math.abs(deltaPct) < 0.01) status = "unchanged";
            else if (delta < 0) status = "decreased";
            else if (delta > 0) status = "increased";

            // Check if qty/description changed but price is same
            const qtyChanged = (Number(v1.quantity) || 1) !== (Number(v2.quantity) || 1);
            if (status === "unchanged" && qtyChanged) status = "modified";

            matched.push({
                description: v1.normalized_description || v1.raw_description || "Unknown Item",
                v1_quantity: Number(v1.quantity) || 1,
                v1_unit_price: Number(v1.unit_price) || 0,
                v1_total: v1Total,
                v2_quantity: Number(v2.quantity) || 1,
                v2_unit_price: Number(v2.unit_price) || 0,
                v2_total: v2Total,
                delta_total: delta,
                delta_pct: Math.round(deltaPct * 100) / 100,
                status,
            });
        } else {
            removedFromV1.push({
                description: v1.normalized_description || v1.raw_description || "Unknown Item",
                quantity: Number(v1.quantity) || 1,
                unit_price: Number(v1.unit_price) || 0,
                total: getTotal(v1),
            });
        }
    }

    // Items in v2 that weren't matched
    v2Items.forEach((item, idx) => {
        if (!v2Used.has(idx)) {
            addedInV2.push({
                description: item.normalized_description || item.raw_description || "Unknown Item",
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                total: getTotal(item),
            });
        }
    });

    // Summary stats
    const v1Total = v1Items.reduce((sum, i) => sum + getTotal(i), 0);
    const v2Total = v2Items.reduce((sum, i) => sum + getTotal(i), 0);
    const totalDelta = v2Total - v1Total;
    const totalDeltaPct = v1Total !== 0 ? Math.round((totalDelta / v1Total) * 10000) / 100 : 0;

    const summary = {
        v1_total: v1Total,
        v2_total: v2Total,
        delta: totalDelta,
        delta_pct: totalDeltaPct,
        items_decreased: matched.filter(m => m.status === "decreased").length,
        items_increased: matched.filter(m => m.status === "increased").length,
        items_added: addedInV2.length,
        items_removed: removedFromV1.length,
        items_unchanged: matched.filter(m => m.status === "unchanged").length,
    };

    return { matched, addedInV2, removedFromV1, summary };
}

/**
 * Generate raw diff text lines for the toggleable diff view.
 * Returns an array of { type: 'removed'|'added'|'unchanged'|'context', text: string }
 */
export function generateRawDiff(diffResult) {
    const lines = [];
    const { matched, addedInV2, removedFromV1 } = diffResult;

    const fmtLine = (desc, qty, price, total) =>
        `${desc} | ${qty} × $${price.toLocaleString(undefined, { minimumFractionDigits: 2 })} = $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    for (const item of matched) {
        if (item.status === "unchanged") {
            lines.push({ type: "unchanged", text: fmtLine(item.description, item.v1_quantity, item.v1_unit_price, item.v1_total) });
        } else {
            lines.push({ type: "removed", text: fmtLine(item.description, item.v1_quantity, item.v1_unit_price, item.v1_total) });
            lines.push({ type: "added", text: fmtLine(item.description, item.v2_quantity, item.v2_unit_price, item.v2_total) });
        }
    }

    for (const item of removedFromV1) {
        lines.push({ type: "removed", text: fmtLine(item.description, item.quantity, item.unit_price, item.total) });
    }

    for (const item of addedInV2) {
        lines.push({ type: "added", text: fmtLine(item.description, item.quantity, item.unit_price, item.total) });
    }

    return lines;
}
