import ProductPageClient from './ProductPageClient';

export async function generateStaticParams() {
  return [{ id: 'prod-123' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ProductPageClient params={resolvedParams} />;
}
