import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Brain",
  description: "The infrastructure that learns how a company works internally.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-ink-50 text-ink-900 antialiased">
        <header className="border-b border-ink-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              Company Brain
            </Link>
            <nav className="flex items-center gap-6 text-sm text-ink-600">
              <Link href="/ask" className="hover:text-ink-900 transition-colors">Ask</Link>
              <Link href="/brain" className="hover:text-ink-900 transition-colors">Brain</Link>
              <Link href="/interviews" className="hover:text-ink-900 transition-colors">Interviews</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-20 border-t border-ink-200 py-8">
          <div className="mx-auto max-w-6xl px-6 text-xs text-ink-500">
            Company Brain · YC Summer 2026 application
          </div>
        </footer>
      </body>
    </html>
  );
}
