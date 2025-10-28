// app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import IpInfoLoader from '@/components/IpInfoLoader';
import ClientLoginForm from '@/components/ClientLoginForm';
import Image from 'next/image';
import { motion } from 'framer-motion';
import verificarImg from '@/images/logo_new.png';


interface Star {
  // ... (keep your Star interface)
  left: number;
  delay: number;
  duration: number;
  drift: number;
  color: string;
  size: number;
}

export default function Page() {
  const [showForm, setShowForm] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // ... (keep your star generation logic)
    const colors = ['#fff','#000','#FFD700'];
    const s: Star[] = Array.from({ length: 60 }).map(() => ({
      left:     Math.random() * 100,
      delay:    Math.random() * 5,
      duration: 5 + Math.random() * 5,
      drift:    (Math.random() - 0.5) * 50,
      color:    colors[Math.floor(Math.random() * colors.length)],
      size:     1 + Math.random() * 3
    }));
    setStars(s);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full
                 bg-gradient-to-br from-red-700/60 via-black/70 to-green-700/60
                 flex flex-col overflow-hidden"
    >
      <IpInfoLoader />


      {/* Add z-index and relative positioning to main content area */}
      {/* This ensures it renders above the KickedBall (which has z-index: 5) */}
      <main className="relative z-20 flex-grow flex items-center justify-center px-4">
        {!showForm ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative text-center" // Keep relative for its children
          >
            {/* Centered Logo */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-115 md:h-115 mx-auto rounded-2xl overflow-hidden mb-4">
              <Image
                src={verificarImg}
                alt="Logo"
                fill
                className="object-cover"
              />
            </div>

            {/* Keep other floating elements if you like */}
            {/* Floating player */}
             <motion.div
              className="absolute left-1/2 top-[-10%] -translate-x-1/2
                         w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24"
              animate={{ y: [-10, 10, -10], x: [0, 20, 0], rotate: [0,15,0] }}
              transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
            >
              {/* Add content here if needed, like another image */}
            </motion.div>

            {/* Floating Red Card */}
            <motion.div
              className="absolute left-[-10%] top-[35%]
                         w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24"
              animate={{ y: [-30, 30, -30], x: [-5,5,-5], rotate: [0,-10,0,10,0] }}
              transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
            >
               {/* Add content here if needed */}
            </motion.div>

            {/* Floating Whistle */}
            <motion.div
              className="absolute left-[105%] top-[30%]
                         w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20"
              animate={{ y: [10,-10,10], scale: [1,1.1,1] }}
              transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
            >
               {/* Add content here if needed */}
            </motion.div>

            {/* REMOVED the old floating ball below the logo */}
            {/* <motion.div className="absolute left-1/2 top-[110%] ... "> ... </motion.div> */}

            {/* Login button */}
            <motion.button
              onClick={() => setShowForm(true)}
              whileHover={{ scale: 1.05 }}
              className="mt-8 px-6 py-3
                         bg-[var(--color-flag_green)]
                         text-[var(--color-flag_white)]
                         rounded-lg font-medium"
            >
              Login
            </motion.button>
          </motion.div>
        ) : (
          // Overlay: clicking outside the form closes it
          <div
            // Ensure Modal is above everything else (z-50 should be fine)
            className="fixed inset-0 z-50 bg-white/10 backdrop-blur-md flex items-center justify-center"
            onClick={() => setShowForm(false)}
          >
            <div className="relative" onClick={e => e.stopPropagation()}>
              <ClientLoginForm />
            </div>
          </div>
        )}
      </main>

      {/* Background stars - these will likely be behind the KickedBall */}
      {stars.map((s, i) => (
        <div
          key={i}
          className="star"
          style={{
            left:              `${s.left}%`,
            animationDelay:    `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            '--drift':         `${s.drift}px`,
            background:        s.color,
            width:             `${s.size}px`,
            height:            `${s.size}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}