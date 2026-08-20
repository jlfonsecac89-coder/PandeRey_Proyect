"use client";

// Grupo colapsable del sidebar — presentacional puro, el estado de qué grupos
// están abiertos vive en AdminNav (necesita coordinar "abrir el grupo activo"
// entre todos los grupos, no solo el propio).
export function AdminNavGroup({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-md px-3 py-1 text-left transition hover:bg-white/[0.03]"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground-muted/70">
          {title}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-foreground-muted/50 transition-transform ${isOpen ? "rotate-90" : ""}`}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      {isOpen && <div className="mt-1.5 space-y-0.5">{children}</div>}
    </div>
  );
}
