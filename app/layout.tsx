import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const archivo = Archivo({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vidanta Assistance Portal",
  description: "Assistance Portal for Vidanta travelers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={archivo.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
