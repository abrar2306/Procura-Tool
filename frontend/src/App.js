import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import NewReview from "@/pages/NewReview";
import ReviewDetail from "@/pages/ReviewDetail";
import Benchmarks from "@/pages/Benchmarks";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/review/new" element={<NewReview />} />
                        <Route path="/review/:id" element={<ReviewDetail />} />
                        <Route path="/benchmarks" element={<Benchmarks />} />
                    </Routes>
                </Layout>
                <Toaster position="top-right" richColors />
            </BrowserRouter>
        </div>
    );
}

export default App;
