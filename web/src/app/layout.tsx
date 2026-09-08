import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "מערכת רכזי הקבלה",
  description: "מערכת ניהול קבלת תלמידים",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
