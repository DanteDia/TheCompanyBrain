// SVG logos para las herramientas conectadas al Brain
// Aproximaciones reconocibles de las marcas oficiales

export function SlackLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.527 2.527 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.272 0a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.522-2.521V2.522A2.527 2.527 0 0 1 15.162 0a2.528 2.528 0 0 1 2.522 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.162 18.956a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.162 24a2.527 2.527 0 0 1-2.522-2.522v-2.522h2.522zm0-1.272a2.527 2.527 0 0 1-2.522-2.522 2.527 2.527 0 0 1 2.522-2.521h6.316A2.527 2.527 0 0 1 24 15.162a2.528 2.528 0 0 1-2.522 2.522h-6.316z"
        fill="#ECB22E"
      />
    </svg>
  );
}

export function GoogleDriveLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M7.71 3.5L1.15 15l3.42 5.93h6.6l3.43-5.93L7.71 3.5z" fill="#4285F4" />
      <path d="M22.85 15L16.29 3.5h-8.58l6.56 11.5h8.58z" fill="#FFCA28" />
      <path d="M19.43 20.93L22.85 15H10.5l-3.43 5.93h12.36z" fill="#34A853" />
    </svg>
  );
}

export function NotionLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#fff" stroke="#E5E5E5" strokeWidth="0.5" />
      <path
        d="M5.5 6.5v11l1.5 1.2L17 18V7l-1.5-1.2L6.5 6.5z"
        fill="#000"
      />
      <path
        d="M8 9v6.5l1 .1V11l3 5h1V9.5l-1-.1V14L9 9H8z"
        fill="#fff"
      />
    </svg>
  );
}

export function ClickUpLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clickupGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF02F0" />
          <stop offset="100%" stopColor="#FFC800" />
        </linearGradient>
      </defs>
      <path
        d="M2 18.36l3.7-2.84c1.97 2.57 4.06 3.76 6.4 3.76 2.32 0 4.36-1.18 6.21-3.74L22 18.34c-2.66 3.69-5.97 5.66-9.9 5.66-3.91 0-7.27-1.95-10.1-5.64z"
        fill="url(#clickupGrad)"
      />
      <path
        d="M12.07 5.43L5.5 11.1l-2.42-2.81L12.08 0l9 8.3-2.43 2.8z"
        fill="#7B68EE"
      />
    </svg>
  );
}

export function MondayLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="3" cy="12" rx="3" ry="3" fill="#FF3D57" />
      <ellipse cx="12" cy="12" rx="3" ry="3" fill="#FFCB00" />
      <ellipse cx="21" cy="12" rx="3" ry="3" fill="#00CA72" />
    </svg>
  );
}

export function AsanaLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="6" r="4" fill="#F06A6A" />
      <circle cx="6" cy="16" r="4" fill="#F06A6A" />
      <circle cx="18" cy="16" r="4" fill="#F06A6A" />
    </svg>
  );
}

export function LinearLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="linearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5E6AD2" />
          <stop offset="100%" stopColor="#A691F0" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#linearGrad)" />
      <path d="M5 11l8 8h-2.5L5 13.5V11zm0-3.5L16.5 19H14L5 10v-2.5zm0-3.5L20 19h-2.5L5 6.5V4z" fill="#fff" opacity="0.95" />
    </svg>
  );
}

export function ZoomLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#0B5CFF" />
      <path
        d="M5 9.5C5 8.67 5.67 8 6.5 8h7c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-5zm11.5 1.2l3-1.7v6l-3-1.7v-2.6z"
        fill="#fff"
      />
    </svg>
  );
}

export function ConfluenceLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="confluenceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0052CC" />
          <stop offset="100%" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        d="M2 17.7c-.3.5-.1 1.1.4 1.4l4.2 2.6c.5.3 1.1.1 1.4-.4l3.6-5.7c2.4-3.9 5.2-3.4 10-1L18.3 9C13 6.6 8.6 6.5 5 12.5L2 17.7z"
        fill="url(#confluenceGrad)"
      />
      <path
        d="M22 6.3c.3-.5.1-1.1-.4-1.4l-4.2-2.6c-.5-.3-1.1-.1-1.4.4l-3.6 5.7c-2.4 3.9-5.2 3.4-10 1L5.7 15c5.3 2.4 9.7 2.5 13.3-3.5L22 6.3z"
        fill="url(#confluenceGrad)"
      />
    </svg>
  );
}

export function JiraLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jiraGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#0052CC" />
          <stop offset="100%" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        d="M21.5 2H11.4c0 2.5 2 4.6 4.6 4.6h1.9V8.4c0 2.5 2 4.6 4.6 4.6V3a1 1 0 00-1-1z"
        fill="#2684FF"
      />
      <path
        d="M16.4 7.1H6.3c0 2.5 2 4.6 4.6 4.6h1.9v1.8c0 2.5 2 4.6 4.6 4.6V8.1a1 1 0 00-1-1z"
        fill="url(#jiraGrad)"
      />
      <path
        d="M11.4 12.2H1.3c0 2.5 2 4.6 4.6 4.6h1.9v1.8c0 2.5 2 4.6 4.6 4.6V13.2a1 1 0 00-1-1z"
        fill="url(#jiraGrad)"
      />
    </svg>
  );
}

export function SalesforceLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.7 6.2c.6-.7 1.5-1.2 2.5-1.2 1.4 0 2.6.8 3.2 1.9.6-.3 1.2-.4 1.9-.4 2.4 0 4.4 2 4.4 4.5s-2 4.5-4.4 4.5c-.3 0-.6 0-.9-.1-.6 1-1.7 1.7-3 1.7-.5 0-1-.1-1.5-.3-.6 1.4-2 2.4-3.6 2.4-1.7 0-3.1-1.1-3.7-2.6-.3.1-.6.1-.9.1C1.6 16.7 0 15.1 0 13c0-1.4.7-2.6 1.8-3.3-.3-.5-.4-1.1-.4-1.7 0-2 1.6-3.6 3.6-3.6 1.2 0 2.2.6 2.9 1.4.4-.7 1.1-1.2 1.8-1.6"
        fill="#00A1E0"
      />
    </svg>
  );
}

export function MicrosoftTeamsLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M19.4 8.5h-4.5V5.7a2.5 2.5 0 015 0v2.8z" fill="#7B83EB" />
      <rect x="9" y="6" width="9" height="12" rx="1" fill="#5059C9" />
      <text x="13.5" y="15" fontSize="8" fill="#fff" fontWeight="bold" textAnchor="middle">T</text>
      <circle cx="6" cy="9" r="3" fill="#7B83EB" />
      <rect x="2" y="11" width="8" height="9" rx="1.5" fill="#7B83EB" />
      <text x="6" y="18" fontSize="7" fill="#fff" fontWeight="bold" textAnchor="middle">T</text>
    </svg>
  );
}

export function WhatsAppLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.39 5.07L2 22l5.07-1.39A9.95 9.95 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
        fill="#25D366"
      />
      <path
        d="M16.7 14.5c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.5-.7-2.5-1.3-3.5-3-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.5-.3z"
        fill="#fff"
      />
    </svg>
  );
}

export function GoogleChatLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 4h18a1 1 0 011 1v12a1 1 0 01-1 1h-9.5L7 22v-4H3a1 1 0 01-1-1V5a1 1 0 011-1z"
        fill="#00AC47"
      />
      <circle cx="9" cy="11" r="1.5" fill="#fff" />
      <circle cx="15" cy="11" r="1.5" fill="#fff" />
    </svg>
  );
}

export function FigmaLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="4" r="3" fill="#F24E1E" />
      <circle cx="15" cy="4" r="3" fill="#FF7262" />
      <circle cx="9" cy="10" r="3" fill="#A259FF" />
      <circle cx="15" cy="10" r="3" fill="#1ABCFE" />
      <circle cx="9" cy="16" r="3" fill="#0ACF83" />
    </svg>
  );
}

export function OktaLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#007DC1" strokeWidth="4" />
    </svg>
  );
}

export function MicrosoftLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function VoiceWaveformLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#D2691E" strokeWidth="2" strokeLinecap="round">
      <line x1="6" y1="9" x2="6" y2="15" />
      <line x1="10" y1="6" x2="10" y2="18" />
      <line x1="14" y1="4" x2="14" y2="20" />
      <line x1="18" y1="8" x2="18" y2="16" />
    </svg>
  );
}

export function CSVLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#0F9D58" />
      <text x="12" y="16" fontSize="6" fill="#fff" fontWeight="bold" textAnchor="middle">CSV</text>
    </svg>
  );
}

export function WebChatLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="14" rx="2" fill="#1C1917" />
      <circle cx="8" cy="10" r="1.2" fill="#fff" />
      <circle cx="12" cy="10" r="1.2" fill="#fff" />
      <circle cx="16" cy="10" r="1.2" fill="#fff" />
      <path d="M9 17l-2 4 5-4" fill="#1C1917" />
    </svg>
  );
}

export function EmailLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#525252" />
      <path d="M2 7l10 7 10-7" stroke="#fff" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function GmailLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22 5.46v13.08a1.5 1.5 0 0 1-1.5 1.5h-2.5V9.91L12 14.45 6 9.91V20H3.5A1.5 1.5 0 0 1 2 18.54V5.46A1.5 1.5 0 0 1 3.5 4h.5L12 10 20 4h.5A1.5 1.5 0 0 1 22 5.46z"
        fill="#EA4335"
      />
      <path d="M2 5.46L12 13l10-7.54V5.46A1.5 1.5 0 0 0 20.5 4H20L12 10 4 4h-.5A1.5 1.5 0 0 0 2 5.46z" fill="#C5221F" />
      <path d="M18 9.91L22 7v11.54A1.5 1.5 0 0 1 20.5 20H18V9.91z" fill="#FBBC04" />
      <path d="M6 9.91L2 7v11.54A1.5 1.5 0 0 0 3.5 20H6V9.91z" fill="#34A853" />
    </svg>
  );
}

export function GeminiLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Gemini"
    >
      <defs>
        <linearGradient id="gemini-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1C7CFF" />
          <stop offset="50%" stopColor="#4D8DFF" />
          <stop offset="100%" stopColor="#9B7DFF" />
        </linearGradient>
      </defs>
      <path
        d="M12 2c.45 5.21 4.79 9.55 10 10-5.21.45-9.55 4.79-10 10-.45-5.21-4.79-9.55-10-10 5.21-.45 9.55-4.79 10-10z"
        fill="url(#gemini-grad)"
      />
    </svg>
  );
}
