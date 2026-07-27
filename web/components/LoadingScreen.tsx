"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { tribe } from "@/assets";
import { refreshHome } from "@/lib/authEvents";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  onComplete?: () => void;
  forceHomeOnComplete?: boolean;
  refreshOnComplete?: boolean;
}

export default function LoadingScreen({ onComplete, refreshOnComplete, forceHomeOnComplete }: LoadingScreenProps) {
  const [text, setText] = useState("");
  const fullText = "Tribe ";
  
  useEffect(() => {
    let index = 0;
  
    const interval = setInterval(() => {
      setText(fullText.substring(0, index + 1));
      index++;
  
      if (index > fullText.length) {
        clearInterval(interval);
  
        setTimeout(() => {
          if (refreshOnComplete) {
            setTimeout(() => {
              refreshHome();
            }, 200);
          }
        
          onComplete?.();
        }, 1000);
      }
    }, 150);
  
    return () => clearInterval(interval);
  }, [onComplete, refreshOnComplete]);

  return (
    <div className='fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center'>
      <div className="w-18 h-18 border dark:border-indigo-600 rounded-full overflow-hidden shadow">
        <Image src={tribe} alt="Tribe Logo" />
      </div>
      <motion.h2
        className='w-28 h-28 object-contain'
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <div className="mb-4 text-4xl font-mono font-bold">
        {text} <span className='animate-blink ml-1'> | </span>
      </div>
      <div className="w-[200px] h-[2px] bg-gray-800 rounded relative overflow-hidden">
        <div className="w-[40%] h-full bg-blue-500 shadow=[0_0_15px_#3b82f6] animate-loading-bar" />
      </div>
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.2, duration: 0.8 }} />
    </div>
  );
}