import type { Metadata, Viewport } from "next";
import { Manrope, Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinansApp — Kurumsal Finans Yönetimi",
  description: "Gelir/gider, borç/alacak, fatura, yatırım ve varlıklarınızı tek yerden takip edin.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinansApp",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  /* Tam ekran PWA'da Android'in durum çubuğu bu rengi alır. Tek sabit
     renk verilirse koyu temada açık (veya tersi) bir şerit kalıyor ve
     "uygulamanın parçası değil" hissi veriyor; iki mod ayrı ayrı
     tanımlandı ve uygulamanın arka planıyla birebir eşleşiyor. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f7" },
    { media: "(prefers-color-scheme: dark)", color: "#10142b" },
  ],
  /* Çentikli ekranlarda içerik kenara kadar uzansın; güvenli alan
     boşluklarını CSS'teki .safe-top / .safe-bottom veriyor. */
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} ${inter.variable} ${robotoMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
        <Toaster />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
