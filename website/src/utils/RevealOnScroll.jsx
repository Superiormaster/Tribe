// src/components/RevealOnScroll.jsx
import { useEffect, useRef } from 'react'

export default function RevealOnScroll({ children }) {
  const ref = useRef(null)
  
  useEffect(() => {
    if (!ref.current) return
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && ref.current) {
        ref.current.classList.add("visible")
        observer.unobserve(ref.current)
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );
    
    if (ref.current) observer.observe(ref.current)
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  )
}