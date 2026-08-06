type SocialLinks = { instagram?: string; facebook?: string; whatsapp?: string } | null;

const ICON_PROPS = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6 };

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.3l.7-3.5h-3V9c0-.4.3-.5.5-.5Z" />
    </svg>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M6 18.5 4.5 21l2.6-1.4A8 8 0 1 0 4 12a8 8 0 0 0 2 5.3Z" />
      <path d="M9 9.5c0 3.5 2 5.5 5.5 5.5.5 0 1-.5 1-1v-.7l-2-.8-.5.8c-1.3-.5-2-1.2-2.5-2.5l.8-.5-.8-2H9.7c-.5 0-.7.5-.7 1Z" />
    </svg>
  );
}

export function SocialIcons({ links, className }: { links: SocialLinks; className?: string }) {
  if (!links || (!links.instagram && !links.facebook && !links.whatsapp)) return null;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {links.instagram && (
        <a
          href={links.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-foreground/60 hover:text-gold"
        >
          <InstagramIcon className="h-5 w-5" />
        </a>
      )}
      {links.facebook && (
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="text-foreground/60 hover:text-gold"
        >
          <FacebookIcon className="h-5 w-5" />
        </a>
      )}
      {links.whatsapp && (
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="text-foreground/60 hover:text-gold"
        >
          <WhatsappIcon className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}
