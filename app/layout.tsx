import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fin — AI Financial Advisor",
  description: "Your personal finance dashboard with an AI advisor that has your back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
