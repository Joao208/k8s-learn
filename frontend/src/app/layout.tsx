import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "K8s Learn - Interactive Kubernetes Playground",
  description:
    "Learn Kubernetes hands-on with an interactive terminal and isolated sandbox environment. Perfect for beginners and experienced users alike.",
  keywords: [
    "kubernetes",
    "k8s",
    "learn",
    "education",
    "cluster",
    "containers",
  ],
  authors: [{ name: "João Barros" }],
  openGraph: {
    title: "K8s Learn - Interactive Kubernetes Playground",
    description:
      "Learn Kubernetes hands-on with an interactive terminal and isolated sandbox environment. Perfect for beginners and experienced users alike.",
    url: "https://k8s-learn.joaobarros.dev",
    siteName: "K8s Learn",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "K8s Learn - Interactive Kubernetes Playground",
    description:
      "Learn Kubernetes hands-on with an interactive terminal and isolated sandbox environment. Perfect for beginners and experienced users alike.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
