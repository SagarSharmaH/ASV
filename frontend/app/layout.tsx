import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ASV – A Silent Voice',
  description: 'AI-powered silent speech recognition for mute and speech-impaired individuals',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-white text-black">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600;1,700;1,800;1,900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300;1,8..60,400;1,8..60,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-white text-black selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  )
}
