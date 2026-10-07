import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freelance Invoice Lite",
  description: "A lightweight, mobile‑first invoicing SaaS that lets freelancers create, send and get paid on the go, with a freemium model that scales to premium features they actually need.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
