'use client';

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryGrid from "@/components/CategoryGrid";
import Storytelling from "@/components/Storytelling";
import InstagramGallery from "@/components/InstagramGallery";
import ContactSection from "@/components/ContactSection";
import { getLocalAppearance } from "@/utils/dbSim";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    setAppearance(getLocalAppearance());
  }, []);

  const email = appearance?.contactEmail || 'hola@panderey.cl';
  const phone = appearance?.contactPhone || '+56 9 1234 5678';
  const facebookUrl = appearance?.facebookUrl || 'https://facebook.com/panderey.cl';
  const instagramUrl = appearance?.instagramUrl || 'https://instagram.com/panderey.cl';
  const twitterUrl = appearance?.twitterUrl || 'https://twitter.com/panderey_cl';

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />
      <Storytelling />
      <CategoryGrid />
      <InstagramGallery />
      <ContactSection />
      
      {/* Footer Section */}
      <footer className="bg-charcoal-light py-12 border-t border-charcoal-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
          <p className="font-serif text-2xl text-gold mb-2 tracking-wider">PAN DE REY</p>
          <p className="mb-4 text-xs tracking-widest uppercase text-gray-500">Artesanal & Premium</p>
          
          {mounted && (
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-6 text-xs text-gray-500 font-sans tracking-wide">
              <span>{phone}</span>
              <span className="hidden md:inline text-gold">•</span>
              <span>{email}</span>
              <span className="hidden md:inline text-gold">•</span>
              <div className="flex gap-4">
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    Facebook
                  </a>
                )}
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    Instagram
                  </a>
                )}
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    Twitter / X
                  </a>
                )}
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Pan de Rey. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  );
}

