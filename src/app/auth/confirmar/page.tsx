import { ConfirmarEmailClient } from "./ConfirmarEmailClient";

export default async function ConfirmarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <ConfirmarEmailClient next={next} />;
}
