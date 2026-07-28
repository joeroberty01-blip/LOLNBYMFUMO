import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getPreferences } from "@/lib/settings/preferences";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { APP_NAME, APP_DESCRIPTION } from "@/config/app";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

const SYSTEM_THEME_SCRIPT = `
(function () {
  try {
    var m = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      document.documentElement.classList.toggle("dark", m.matches);
    }
    apply();
    m.addEventListener("change", apply);
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language, theme, fontSize } = await getPreferences();
  const dict = getDictionary(language);
  const themeClass = theme === "dark" ? "dark" : "";

  return (
    <html
      lang={language}
      data-font-size={fontSize}
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased ${themeClass}`}
    >
      {theme === "system" && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
        </head>
      )}
      <body className="min-h-full flex flex-col">
        <I18nProvider t={dict} language={language}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
