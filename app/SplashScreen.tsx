"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SPLASH_DURATION, startSplash } from "./splash-controller.mjs";
import "./SplashScreen.css";

export default function SplashScreen({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current || !pageRef.current) return;
    return startSplash({
      root: rootRef.current,
      page: pageRef.current,
      scrollRoot: document.documentElement,
      body: document.body,
      view: window,
      onComplete: () => setReady(true),
    });
  }, []);

  return (
    <div ref={rootRef} className="site-entry" data-phase={ready ? "ready" : "loading"} style={{ "--splash-duration": `${SPLASH_DURATION}ms` } as CSSProperties}>
      {!ready && (
        <div className="splash-screen" role="status" aria-label="Opening the DECODE archive">
          <div className="splash-screen__header" aria-hidden="true"><span>DECODE / DIGITAL ARCHIVE</span><span>SECURE CHANNEL</span></div>
          <div className="splash-screen__core" aria-hidden="true">
            <svg className="splash-screen__reticle" viewBox="0 0 400 400" fill="none">
              <g stroke="currentColor" strokeWidth="0.7" opacity="0.3">
                <circle cx="200" cy="200" r="146" />
                <circle cx="200" cy="200" r="174" strokeDasharray="1 12" />
                <path d="M200 13v35M200 352v35M13 200h35M352 200h35" />
                <path d="M70 95V70h25M305 70h25v25M330 305v25h-25M95 330H70v-25" />
              </g>
              <g className="splash-screen__orbit" stroke="currentColor" strokeWidth="1.4">
                <circle cx="200" cy="200" r="157" strokeDasharray="72 175 26 220" />
                <circle cx="200" cy="43" r="3" fill="currentColor" stroke="none" />
              </g>
              <g className="splash-screen__orbit splash-screen__orbit--inner" stroke="currentColor" opacity="0.45">
                <circle cx="200" cy="200" r="131" strokeDasharray="34 90 10 150" />
              </g>
            </svg>
            <span className="splash-screen__eyebrow">THE SIGNAL HAS FOUND YOU</span>
            <span className="splash-screen__wordmark">DECODE<span>_</span></span>
            <span className="splash-screen__code">0100 / 0110 / 0011 / 1010</span>
            <span className="splash-screen__progress"><span /></span>
            <span className="splash-screen__status"><span>DECRYPTING ACCESS</span><span>ACCESS GRANTED</span></span>
          </div>
          <div className="splash-screen__scan" aria-hidden="true" />
          <div className="splash-screen__footer" aria-hidden="true"><span>FOLLOW THE SIGNAL.</span><span>INITIALIZING ARCHIVE / 002</span></div>
        </div>
      )}
      <div ref={pageRef} className="site-entry__page">{children}</div>
      <noscript><style>{".splash-screen{display:none!important}.site-entry__page{visibility:visible!important;opacity:1!important;transform:none!important;filter:none!important}"}</style></noscript>
    </div>
  );
}
