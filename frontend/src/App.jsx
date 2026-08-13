import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Reviews from "@/pages/Reviews";
import NewReview from "@/pages/NewReview";
import ReviewDetail from "@/pages/ReviewDetail";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Layout>
                    <ErrorBoundary>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/reviews" element={<Reviews />} />
                            <Route path="/review/new" element={<NewReview />} />
                            <Route path="/review/:id" element={<ReviewDetail />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </ErrorBoundary>
                </Layout>
                <Toaster position="top-right" richColors />
            </BrowserRouter>
        </div>
    );
}

export default App;
