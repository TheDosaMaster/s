import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAT Question Bank",
  description:
    "Convert a question-bank PDF into JSON, practice it, and track every right and wrong answer by skill and domain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* THESIS: One quiet tool owns the whole loop — PDF in, answer questions, tracked performance by skill and domain; refuses the card-dashboard and marketing-hero defaults. OWN-WORLD: Light zinc neutrals, hairline borders, white surfaces, one blue accent for interaction, emerald/red reserved for answer state; Geist sans, tabular numerals, 8-12px radii, no decoration. STORY: Import a PDF, answer with A-D, get right/wrong plus the explanation instantly, then sort and filter the bank to find what is weak. FIRST VIEWPORT: Sticky wordmark and three tabs; the import page opens on the dropzone, or on the loaded bank's counts with Start practice. FORM: user-pinned neutral minimal (shadcn-like); the pin beat the roll, so no seed key; code-led because no image generation exists here. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. */}
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
