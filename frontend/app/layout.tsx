import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DiscoverSUTD 2025',
  description: 'DiscoverSUTD 2025 - A comprehensive platform for SUTD students',
  icons: {
    icon: '/dsutd.png',
    shortcut: '/dsutd.png',
    apple: '/dsutd.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 