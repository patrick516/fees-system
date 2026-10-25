import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "./ThemeProvider";
import InstallPWA from "../components/InstallPWA";

export const metadata: Metadata = {
  title: "SchoolPay — Parent Portal",
  description: "View your child's school fee payment status",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SchoolPay",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {/*  This component will register the Service Worker and show the install prompt */}
        <InstallPWA />
      </body>
    </html>
  );
}
