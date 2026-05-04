// src/components/Home.jsx
import { motion, useAnimation } from "framer-motion"
import { useEffect } from "react"
import { Link } from "react-router-dom"
import RevealOnScroll from "../RevealOnScroll"

export default function Home() {
  return (
    <section className="flex min-h-screen justify-center items-center text-white overflow-hidden">
      <RevealOnScroll>
        <div className="max-w-7xl mx-auto text-center z-10 px-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
            
            <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r leading-tight from-blue-500 to-purple-600 bg-clip-text text-transparent leading-relaxed md:text-6xl">
              I build{" "} 
              <span className="text-cyan-300">Scalable</span> &{" "} <span className="text-cyan-300">Beautiful</span> Website, Web
              App and Mobile Apps.
            </h1>
            
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-2xl mx-auto max-w-lg mt-6 text-lg text-indigo-100 mb-8">
            I'm a focused Software Engineer who build high-performance web and mobile applications. Using HTML, CSS, JS, React.js, reactnative, Tailwindcss, Flask, Django and Python, I create products that are fast, responsive and visually clean.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-2xl mx-auto max-w-lg mt-6 text-lg mb-8 text-indigo-100">
              My work is driven by real-world problem solving—delivering exceptional performance and a delightful user experience without compromising functionality.
            </motion.p>
          </motion.div>
          <div className="flex justify-center space-x-4">
            <li className="py-3 list-none bg-blue-500 px-6 rounded text-medium transition overflow-hidden relative text-white hover:-translate-y-0.5 hover:shadow[0_0_15px_rgba(59,139,246,0.4)]">
              <Link to="/Projects">View Projects</Link>
            </li>
            <li className="py-3 border border-blue-500/50 list-none px-6 rounded text-medium transition-all duration-200 overflow-hidden relative text-blue-300 hover:-translate-y-0 hover:shadow[0_0_15px_rgba(59,139,246,0.2)] hover:bg-blue-500/10">
              <Link to="/contact">Contact Me</Link>
            </li>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}