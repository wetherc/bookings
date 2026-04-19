import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/lib/xp.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bookings",
  description: "Coordinate availability for events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body
        className={inter.className}
        style={{ backgroundColor: "rgb(236, 233, 216)", height: "100%", margin: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
