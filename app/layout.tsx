import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "فروع تكنولوجي فالي",
  description: "اعرف أقرب فرع لتكنولوجي فالي في ثوانٍ.",
  icons: {
    icon: "/tv-logo.png",
    apple: "/tv-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
