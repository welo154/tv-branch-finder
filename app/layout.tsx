import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "فروع تكنولوجي فالي",
  description: "اعرف أقرب فرع لتكنولوجي فالي في ثوانٍ.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/favicon-192.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
