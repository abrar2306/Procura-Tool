import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const getBenchmarks = () => api.get("/benchmarks").then((r) => r.data);
export const upsertBenchmark = (payload) => api.post("/benchmarks", payload).then((r) => r.data);
export const deleteBenchmark = (role) => api.delete(`/benchmarks/${encodeURIComponent(role)}`).then((r) => r.data);
export const setMultiplier = (value) => api.put("/benchmarks/multiplier", { value }).then((r) => r.data);
export const importBenchmarks = (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/benchmarks/import", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};

// Catalog (historical procurement records)
export const listCatalog = (kind) => api.get(`/catalog/${kind}`).then((r) => r.data);
export const addCatalogRow = (kind, payload) => api.post(`/catalog/${kind}`, payload).then((r) => r.data);
export const deleteCatalogRow = (kind, id) => api.delete(`/catalog/${kind}/${id}`).then((r) => r.data);
export const importCatalog = (kind, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/catalog/${kind}/import`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};

export const createReview = (payload) => api.post("/reviews", payload).then((r) => r.data);
export const listReviews = () => api.get("/reviews").then((r) => r.data);
export const getReview = (id) => api.get(`/reviews/${id}`).then((r) => r.data);
export const updateReview = (id, payload) => api.patch(`/reviews/${id}`, payload).then((r) => r.data);
export const deleteReview = (id) => api.delete(`/reviews/${id}`).then((r) => r.data);
export const analyzeReview = (id) => api.post(`/reviews/${id}/analyze`).then((r) => r.data);
export const getChatHistory = (id) => api.get(`/reviews/${id}/chat`).then((r) => r.data);
export const uploadDocuments = (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api
        .post(`/reviews/${id}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        .then((r) => r.data);
};
export const uploadDocumentsV2 = (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api
        .post(`/reviews/${id}/upload-v2`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        .then((r) => r.data);
};
export const compareProposals = (id) => api.post(`/reviews/${id}/compare`).then((r) => r.data);

export async function streamChat(reviewId, message, onDelta, onDone, onError) {
    try {
        const res = await fetch(`${API}/reviews/${reviewId}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice(5).trim();
                try {
                    const data = JSON.parse(jsonStr);
                    if (data.delta) onDelta(data.delta);
                    if (data.done) onDone();
                    if (data.error) onError(data.error);
                } catch (_e) { /* ignore malformed chunk */ }
            }
        }
    } catch (e) {
        onError(e.message);
    }
}
