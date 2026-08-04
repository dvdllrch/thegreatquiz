import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "John or Kacey? — A Lyric Quiz",
  description:
    "Can you tell a John Mayer lyric from a Kacey Musgraves lyric? Ten lines, two songwriters, one final score.",
  icons: {
    icon: "/title.svg",
    shortcut: "/title.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
