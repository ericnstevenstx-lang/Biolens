import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ResultsPage from "@/pages/ResultsPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import ExploreMaterialsPage from "@/pages/ExploreMaterialsPage";

function App() {
  return (
    <div className="grain-overlay min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F7' }}>
      <BrowserRouter>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/explore" element={<ExploreMaterialsPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
