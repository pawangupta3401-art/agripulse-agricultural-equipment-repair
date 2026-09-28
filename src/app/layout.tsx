import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriPulse - किसान मित्र",
  description: "From breakdown to back-in-field. सरल और आसान किसान सहायता सेवा।",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
