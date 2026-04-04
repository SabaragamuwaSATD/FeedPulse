import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeedPulse — AI-Powered Product Feedback",
  description:
    "Collect product feedback and feature requests, automatically categorised and prioritised by AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
