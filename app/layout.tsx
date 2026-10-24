import type { Metadata, Viewport } from "next";
import TargetCursor from "./TargetCursor";
import SplashScreen from "./SplashScreen";
import "./globals.css";

export const metadata: Metadata = {
  title: "DECODE",
  description:
    "An intercepted transmission. Three layers of encryption. One message waiting to be found. Enter the DECODE archive.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#030711",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <canvas id="rain" aria-hidden="true" />
        <div className="atmosphere" aria-hidden="true" />
        <div className="scanlines" aria-hidden="true" />
        <audio id="background-music" src="/back-to-life.mp3" autoPlay loop preload="auto" aria-hidden="true" />
        <SplashScreen>{children}</SplashScreen>
        <TargetCursor
          targetSelector='.cursor-target, a[href], button:enabled, input:not(:disabled), [role="button"]:not([aria-disabled="true"])'
          spinDuration={2}
          hoverDuration={0.2}
          size={36}
          cornerSize={12}
          thickness={3}
          padding={6}
          dotSize={4}
          cursorColor="#ffffff"
          cursorColorOnTarget="#ffffff"
          blendMode="difference"
          parallaxOn
          matchRadius
          showLabel
          clickEffect
          hideDefaultCursor
        />
      </body>
    </html>
  );
}
