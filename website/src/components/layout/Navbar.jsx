// src/components/Navbar.jsx
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { head } from '../assets'
import { Link } from "react-router-dom"

export default function Navbar({ open, setOpen }) {
  const [showNav, setShowNav] = useState(false);
  const closeMenu = () => setOpen(false);

    useEffect(() => {
      document.body.style.overflow = open ? "hidden" : "";
    }, [open]);
    
    useEffect(() => {
      const handleScroll = () => {
        if (window.scrollY > 50) {
          setShowNav(true);
        } else {
          setShowNav(false);
        }
      };
      
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    
  return (
    <>
      {!showNav && (
    <nav className="flex justify-between items-center navbar shadow-l w-full bg-gray-900 border-b py-3 text-white shadow-lg transition-all duration-300 z-50">
        <img src={ head } alt="Superior" className="w-[100px]" />
          <motion.h1 className="text-2xl font-bold font-mono tracking-tight" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}>
           SM Int'l
          </motion.h1>
          
      <div className="cursor-pointer relative h-5 w-7 md:hidden" onClick={() => setOpen((prev) => !prev)}>
          ☰
      </div>
      
      <ul className="list-none flex sm:flex hidden justify-end items-center flex-1 md:flex gap-6 text-white space-x-8 font-medium">
          <li className="text-gray-300 hover:text-white transition-colors">
            <Link to="/">Home</Link>
          </li>
          <li className="text-gray-300 hover:text-white transition-colors">
            <Link to="/portfolio">portfolio</Link>
          </li>
          <li className="text-gray-300 hover:text-white transition-colors">
            <Link to="/apps">Apps</Link>
          </li>
        </ul>

        {open && (
          <ul className={`absolute top-18 right-10 w-[150px] bg-gray-900 p-6 text-black flex flex-col gap-8 border-t z-50 transition-all duration-300 ease-in-out`}>
            <li className="text-gray-300 transition-colors my-4 text-2xl font-semibold transform transition-transform">
              <Link to="/" onClick={closeMenu}>Home</Link>
            </li>
            <li className="text-gray-300 transition-colors my-4 text-2xl font-semibold transform transition-transform">
              <Link to="/portfolio" onClick={closeMenu}>Portfolio</Link>
            </li>
            <li className={`text-gray-300 transition-colors my-4 text-2xl font-semibold transform transition-transform`}>
              <Link to="/apps" onClick={closeMenu}>Apps</Link>
            </li>
          </ul>
        )}
    </nav>
  )}

      {showNav && (
        <nav className="fixed top-0 left-0 right-0 flex justify-between items-center py-3 px-8 w-full bg-gray-900 text-white shadow-lg transition-all duration-300 z-50">
          <img src={head} alt="Logo" className="w-[100px]" />
           <motion.h1 className="text-2xl font-bold font-mono tracking-tight" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}>
           SM Int'l
          </motion.h1>
      
      <div className="cursor-pointer relative h-5 w-7 md:hidden" onClick={() => setOpen((prev) => !prev)}>
          ☰
      </div>
      
          <ul className="flex gap-6 list-none sm:flex hidden justify-end items-center flex-1 md:flex text-white space-x-8 font-medium">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/portfolio">Portfolio</Link></li>
            <li><Link to="/apps">Apps</Link></li>
          </ul>
          
          {open && (
          <ul className={`absolute top-16 right-10 w-[150px] bg-gray-900 p-6 text-black flex flex-col gap-8 border-t z-50 transition-all duration-300 ease-in-out`}>
            <li className="text-gray-300 transition-colors my-4 text-2xl font-semibold transform transition-transform duration-300">
              <Link to="/" onClick={closeMenu}>Home</Link>
            </li>
            <li className="text-gray-300 transition-colors my-4 text-2xl font-semibold transform transition-transform duration-300">
              <Link to="/portfolio"onClick={closeMenu}>Portfolio</Link>
            </li>
            <li className="text-gray-300 transition-colors my-4 text-2xl font-semibold transform transition-transform duration-300">
              <Link to="/apps" onClick={closeMenu}>Apps</Link>
            </li>
          </ul>
        )}
        </nav>
      )}
    </>
  );
}