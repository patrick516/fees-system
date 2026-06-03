import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolPay — Parent Portal",
  description: "View your child's school fee payment status",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">{children}</body>
    </html>
  );
}
