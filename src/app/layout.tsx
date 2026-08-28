import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ThemeProvider from "@/components/theme/theme-provider";
import QueryProvider from "@/components/providers/QueryProvider";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NextTopLoader from 'nextjs-toploader';
import GlobalMutationLoader from "@/components/common/GlobalMutationLoader";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karobar 247",
  description: "Enterprise Resource Planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en" suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className={inter.className}>
        <NextTopLoader color="#2563eb" showSpinner={false} /> 
        <ToastContainer position="bottom-right" autoClose={3000} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <GlobalMutationLoader/>
            <main className="flex min-h-screen flex-col">{children}</main>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
