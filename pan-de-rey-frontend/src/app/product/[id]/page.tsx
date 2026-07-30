import ProductPageClient from './ProductPageClient';
import type { Metadata, ResolvingMetadata } from 'next';

export async function generateStaticParams() {
  return [{ id: 'prod-123' }];
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  // Here we would fetch product data from DB. Using mock data for now.
  const title = `Pan de Rey - Producto ${id}`;
  const description = 'Pan artesanal de masa madre con 48 horas de fermentación.';
  const imageUrl = 'https://images.unsplash.com/photo-1509440159596-0249088772ff';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ProductPageClient params={resolvedParams} />;
}
