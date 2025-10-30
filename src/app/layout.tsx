
"use client";

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context';
import { TitleManager } from '@/components/title-manager';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const ParticlesComponent = dynamic(() => import('@/components/particles-component'), {
  ssr: false,
});

const themeParticleColors: { [key: string]: string } = {
  'light': '#09090b',
  'theme-default': '#ffffff',
  'theme-zinc': '#ffffff',
  'theme-rose': '#fde3e6',
  'theme-blue': '#a8d8ff'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(false);
  const [particleDensity, setParticleDensity] = useState(40);
  const [particleColor, setParticleColor] = useState('#ffffff');
  const [currentTheme, setCurrentTheme] = useState('theme-default');
  const [currentFont, setCurrentFont] = useState('font-body');


  useEffect(() => {
    setIsClient(true);
    
    const handleSettingsChange = () => {
      const storedTheme = localStorage.getItem("app-theme") || "theme-default";
      const storedFont = localStorage.getItem("app-font") || "font-body";
      const storedParticles = localStorage.getItem("app-particles") === "true";
      const storedDensity = localStorage.getItem("app-particles-density");
      
      document.documentElement.className = storedTheme;
      document.body.classList.remove('font-body', 'font-mono');
      document.body.classList.add(storedFont);
      
      setCurrentTheme(storedTheme);
      setCurrentFont(storedFont);
      setParticlesEnabled(storedParticles);
      setParticleDensity(storedDensity ? parseInt(storedDensity, 10) : 40);
      setParticleColor(themeParticleColors[storedTheme] || '#ffffff');
    };

    handleSettingsChange();

    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('onLocalStorageChange', handleSettingsChange);

    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('onLocalStorageChange', handleSettingsChange);
    };
  }, []);

  return (
    <html lang="en" className={currentTheme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(
        "font-light antialiased text-foreground bg-background",
        currentFont
      )}>
        {isClient && particlesEnabled && <ParticlesComponent density={particleDensity} color={particleColor} />}
        <AuthProvider>
          <TitleManager />
          <div className="content-wrapper min-h-screen relative z-10">
            {children}
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
