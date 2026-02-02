import "./globals.css";

export const metadata = {
  title: "神戸外語 LMS",
  description: "神戸外語日本語学校の学習管理システム",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
