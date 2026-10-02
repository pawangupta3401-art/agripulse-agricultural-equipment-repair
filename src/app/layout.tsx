import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriPulse — कृषि उपकरण रिपेयर",
  description: "खेती की मशीनों की मदद, एक जगह। मशीन की समस्या बताएं, सही मदद पाएं।",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AgriPulse",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#165420",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi">
      <body className="bg-slate-100 min-h-screen text-slate-900 antialiased flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-2xl relative">
          {children}
        </div>
      </body>
    </html>
  );
}
