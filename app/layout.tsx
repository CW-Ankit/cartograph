import { AuthProvider } from "@/components/auth/auth-provider";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const ubuntu = localFont({
  src: [
    {
      path: "../public/fonts/Ubuntu-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/Ubuntu-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/Ubuntu-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Ubuntu-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/Ubuntu-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Ubuntu-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/Ubuntu-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Ubuntu-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-ubuntu",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph",
  description: "Map codebase structure and real dependencies.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("cartograph_theme")?.value;
  const initialDark = themeCookie === "dark";
  const dataTheme = themeCookie === "dark" ? "dark" : themeCookie === "light" ? "light" : undefined;

  return (
    <html
      lang="en"
      className={`${ubuntu.variable} ${geistMono.variable} ${initialDark ? "dark" : ""} h-full antialiased`}
      data-theme={dataTheme}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}