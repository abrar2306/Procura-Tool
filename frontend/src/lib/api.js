import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
    const customKey = localStorage.getItem("customGeminiKey");
    if (customKey) {
        config.headers["X-Gemini-Api-Key"] = customKey;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        let message = "An unexpected error occurred.";
        if (error.response) {
            const status = error.response.status;
            if (status === 422) {
                message = "Validation Error: Please check your input and try again.";
            } else if (status === 404) {
                message = "Resource not found.";
            } else if (error.response.data && error.response.data.detail) {
                const detail = error.response.data.detail;
                message = typeof detail === "string" ? detail : JSON.stringify(detail);
            } else if (status >= 500) {
                message = "Server error. Please try again later.";
            }
        } else if (error.message) {
            message = error.message;
        }
        
        toast.error("Error", {
            description: message,
        });
        
        return Promise.reject(error);
    }
);

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

export const createReview = (payload) => api.post("/requests", payload).then((r) => r.data);
export const listReviews = () => api.get("/requests").then((r) => r.data);
export const getReview = (id) => api.get(`/requests/${id}`).then((r) => r.data);
export const updateReview = (id, payload) => api.patch(`/requests/${id}`, payload).then((r) => r.data);
export const deleteReview = (id) => api.delete(`/requests/${id}`).then((r) => r.data);
export const analyzeReview = (id) => api.post(`/requests/${id}/analyze`).then((r) => r.data);
export const getChatHistory = (id) => api.get(`/requests/${id}/chat`).then((r) => r.data);

export const uploadDocuments = async (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    // 1. Upload
    await api.post(`/requests/${id}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    // 2. Extract
    const extRes = await api.post(`/requests/${id}/extract`);
    return extRes.data;
};
export const uploadDocumentsV2 = uploadDocuments; // use same logic

export const compareProposals = (id) => api.post(`/requests/${id}/compare`).then((r) => r.data);

export async function streamChat(reviewId, message, onDelta, onDone, onError) {
    try {
        const customKey = localStorage.getItem("customGeminiKey");
        const headers = { "Content-Type": "application/json" };
        if (customKey) {
            headers["X-Gemini-Api-Key"] = customKey;
        }

        const res = await fetch(`${API}/requests/${reviewId}/chat`, {
            method: "POST",
            headers,
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
