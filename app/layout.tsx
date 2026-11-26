import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Practice Interviewer",
  description: "Interview practice, not a hiring assessment.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
