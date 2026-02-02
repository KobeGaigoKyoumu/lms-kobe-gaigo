import "./globals.css";
import PWARegistry from "./PWARegistry";

export const metadata = {
  title: "神戸外語LMS",
  description: "神戸外語日本語学校の学習管理システム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "神戸外語LMS",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <PWARegistry />
        {children}
      </body>
    </html>
  );
}
