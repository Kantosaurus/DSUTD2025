import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DiscoverSUTD",
  description: "Your gateway to exploring clubs, events, and opportunities at SUTD",
  icons: {
    icon: [
      {
        url: '/DSUTD logo clear.png',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/DSUTD logo clear.png',
        type: 'image/png',
      }
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
