import "./globals.css";

export const metadata = {
  title: "神戸外語 LMS",
  description: "神戸外語日本語学校の学習管理システム",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LMS 神戸外語",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful');
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
