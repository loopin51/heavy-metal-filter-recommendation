import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "중금속 흡착 필터 추천 | 과학적 근거 기반",
  description:
    "동료심사 학술 문헌 데이터를 기반으로 중금속 오염 조건에 맞는 흡착 필터 구조를 추천하는 연구·교육용 서비스.",
};

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-800">
          <span className="inline-block h-6 w-6 rounded bg-gradient-to-b from-teal-400 to-slate-500" />
          중금속 흡착 필터 추천
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600">
            추천
          </Link>
          <Link
            href="/materials"
            className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600"
          >
            소재 사전
          </Link>
          <Link href="/about" className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600">
            데이터 출처
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-800">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          연구·교육 목적 서비스 · 데이터 버전 {process.env.NEXT_PUBLIC_DB_VERSION || "1.0"} · 2026-06
        </footer>
      </body>
    </html>
  );
}
