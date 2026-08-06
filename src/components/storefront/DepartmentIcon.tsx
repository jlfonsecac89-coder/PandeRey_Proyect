// Íconos simples por palabra clave del departamento — sin librería externa,
// con un ícono genérico de respaldo para departamentos que el cliente
// nombre distinto (ej. "Repostería" en vez de "Pastelería").
export function DepartmentIcon({ name, className }: { name: string; className?: string }) {
  const key = name.toLowerCase();

  if (key.includes("pan")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M4 13c0-4.5 3.5-8 8-8s8 3.5 8 8-3 6-8 6-8-1.5-8-6Z" />
        <path d="M8 12c1-1.5 2.5-2 4-2s3 .5 4 2" />
      </svg>
    );
  }
  if (key.includes("pastel") || key.includes("repost") || key.includes("tort")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M4 12l1.5-4h13L20 12" />
        <path d="M12 8V4M12 4c-.8 0-1.5-.6-1.5-1.5S11.2 1 12 1s1.5.6 1.5 1.5S12.8 4 12 4Z" />
      </svg>
    );
  }
  if (key.includes("caf") || key.includes("bebid")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" />
        <path d="M16 10h2a2 2 0 0 1 0 4h-2M8 3c-.5.8-.5 1.2 0 2M12 3c-.5.8-.5 1.2 0 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z" />
    </svg>
  );
}
