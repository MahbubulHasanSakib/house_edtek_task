import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collaborative Editor",
  description: "A real-time collaborative document editor with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t border-white/5 bg-black/20 backdrop-blur-md mt-auto">
          <p>
            Developed by <strong>Mahbubul Hasan Sakib</strong> for House of Edtech
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="https://github.com/MahbubulHasanSakib" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub Profile</a>
            <span>|</span>
            <a href="https://www.linkedin.com/in/mhsakib29/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn Profile</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
