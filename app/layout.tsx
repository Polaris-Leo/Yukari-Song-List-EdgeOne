import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '优花璃点歌台',
  description: '优花璃的直播点歌台',
  referrer: 'no-referrer',
  icons: {
    icon: 'https://cdn.imgos.cn/vip/2026/03/23/69c11aa551328.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
