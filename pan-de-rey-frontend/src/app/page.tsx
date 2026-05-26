import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryGrid from "@/components/CategoryGrid";
import Storytelling from "@/components/Storytelling";
import InstagramGallery from "@/components/InstagramGallery";
import ContactSection from "@/components/ContactSection";

export default function Home() {
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
          <p className="font-serif text-2xl text-gold mb-4 tracking-wider">PAN DE REY</p>
          <p className="mb-4">Artesanal & Premium</p>
          <p>© {new Date().getFullYear()} Pan de Rey. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  );
}
