import { Routes, Route } from "react-router-dom"
import { useState, useEffect } from "react"
import api from "./api"
import styles from "@/styles"
import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import Contact from "@/components/contact/Contact"
import LoadingScreen from "@/components/utils/LoadingScreen"
import ScrollToTop from "@/components/utils/ScrollToTop"
import Login from "@/components/auth/Login"

function PublicApp() {
  const [projects, setProjects] = useState([])
  const [apps, setApps] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    API.get("/portfolio/")
      .then((r) => setProjects(r.data))
      .catch((e) => console.error("projects:", e));

    API.get("/portfolio/apps")
      .then((r) => setApps(r.data))
      .catch((e) => console.error("apps:", e));
  }, []);

  useEffect(() => {
    // Fake loading for smooth UX (1.5s)
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) return <LoadingScreen />;

  return (
    <>
      <ScrollToTop />
      <div className="bg-black w-full overflow-hidden transition-opacity duration-700 min-h-screen text-gray-500">
        <div className={`${styles.paddingX} bg-gray-50 dark:bg-gray-900 text-white ${styles.flexCenter}`}>
          <div className={`${styles.boxWidth}`}>
            <Navbar open={open} setOpen={setOpen} />

            <Routes>
              <Route index element={<Hero />} />
              <Route path="/portfolio" element={<Portfolio projects={projects} />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/apps" element={<Apps apps={apps} />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </div>
        </div>

        <div className={`${styles.paddingX} ${styles.flexStart} text-gray-900 dark:text-gray-100`}>
          <div className={`${styles.boxWidth}`}>
            <Footer />
          </div>
        </div>
      </div>
    </>
  )
}

export default PublicApp;