import InvestigationController from "./investigation-controller";
import TextType from "./TextType";
import SignalField from "./SignalField";
import { SPLASH_DURATION } from "./splash-controller.mjs";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#investigation">Skip to investigation</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="DECODE archive, back to top" data-cursor-label="Back to top">
          <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
            <path d="M3 10V3h7M26 3h7v7M33 26v7h-7M10 33H3v-7" />
            <path className="brand-d" d="M12 10h6a8 8 0 0 1 0 16h-6z" />
          </svg>
          <span>DECODE<span className="brand-divider">/</span><span className="brand-sub">DIGITAL ARCHIVE</span></span>
        </a>
        <div className="header-tools">
          <span className="connection"><span className="status-dot" /> SECURE LOCAL CONNECTION</span>
          <button className="utility-button" id="motion-toggle" type="button" aria-pressed="false" aria-label="Pause background animation">
            <span aria-hidden="true">Ⅱ</span><span id="motion-label">PAUSE FX</span>
          </button>
          <button className="utility-button" id="sound-toggle" type="button" aria-pressed="true" aria-label="Pause music and interface sound" title="Back To Life — Aylex">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-4v12l-4-4H3zM14 7q4 3 0 6" /></svg>
            <span id="sound-label">SOUND ON</span>
          </button>
        </div>
      </header>

      <main className="shell" id="top">
        <section className="intro" aria-labelledby="headline">
          <div className="intro-content">
            <p className="eyebrow"><span className="crosshair" aria-hidden="true">+</span> AN INTERACTIVE DIGITAL MYSTERY</p>
            <h1 id="headline">
              <TextType
                text={["THE TRUTH IS\nIN THE CODE."]}
                className="headline-typing"
                data-text={"THE TRUTH IS\nIN THE CODE."}
                typingSpeed={75}
                initialDelay={SPLASH_DURATION}
                loop={false}
                pauseDuration={1500}
                deletingSpeed={50}
                deleteMode="backspace"
                typeEffect="none"
                mistakes={0}
                cursorStyle="underscore"
                cursorGlide
                showCursor
                cursorColor="currentColor"
                prefixColor="currentColor"
                cursorBlinkDuration={0.5}
                cursorCharacter="_"
                prefix=""
                highlightLastWord
              />
            </h1>
            <button className="about-button" id="about-button" type="button">ABOUT THE ARCHIVE <span aria-hidden="true">↗</span></button>
            <div className="intro-meta">
              <span><span className="status-dot" /><span id="investigation-status">INVESTIGATION OPEN</span></span>
              <span id="remaining-layers">3 LAYERS TO DECRYPT</span><span>EST. 5 MIN</span>
            </div>
          </div>
          <SignalField />
          <div className="hero-baseline"><span>ARCHIVE ACCESS <b>GRANTED</b></span><span>DECODE &amp; INVESTIGATE</span></div>
        </section>

        <section id="investigation" className="investigation" aria-labelledby="investigation-heading" tabIndex={-1}>
          <div className="investigation-topline">
            <h2 id="investigation-heading"><span className="status-dot" /><span id="system-status">SYSTEM ONLINE</span></h2>
            <span className="case-reference">CASE 001–A <span>/</span> RESTRICTED ACCESS</span>
            <span className="session-label" id="storage-status">PROGRESS SAVED ON THIS DEVICE</span>
          </div>
          <div className="game-layout">
            <aside className="mission-panel" aria-labelledby="mission-heading">
              <div className="section-heading"><h3 id="mission-heading">THE INVESTIGATION</h3></div>
              <p className="mission-kicker">FOLLOW THE FRAGMENTS</p>
              <p className="mission-description">Every answer opens a door.<br />Start with the signal.</p>
              <ol className="mission-list" id="mission-list">
                <li className="mission-item active" data-stage="0" aria-current="step"><span className="mission-index">01</span><span className="mission-name"><strong>THE SIGNAL</strong><small>Receiving packet…</small></span><span className="mission-state">ACTIVE</span></li>
                <li className="mission-item" data-stage="1"><span className="mission-index">02</span><span className="mission-name"><strong>THE PATTERN</strong><small>Number sequence</small></span><span className="mission-state">LOCKED</span></li>
                <li className="mission-item" data-stage="2"><span className="mission-index">03</span><span className="mission-name"><strong>THE MESSAGE</strong><small>Encoded message</small></span><span className="mission-state">LOCKED</span></li>
              </ol>
              <div className="progress-block">
                <div className="progress-label"><span>DECRYPTION PROGRESS</span><strong id="progress-text">0 / 3</strong></div>
                <progress className="progress-track" id="progress-track" max="3" value="0" aria-label="Completed encryption layers">0 of 3 layers decrypted</progress>
                <p id="progress-caption">Three layers. One hidden truth.</p>
              </div>
              <div className="mission-stamp" aria-hidden="true">DECODE BUREAU<br /><span>INFORMATION WANTS TO BE FOUND.</span><div className="barcode" />001A · 7FA2 · 0317</div>
            </aside>

            <section className="puzzle-panel" aria-labelledby="mission-title">
              <div className="section-heading"><h3>INTERCEPTED DATA</h3><span className="live-label"><span className="status-dot" /> LIVE FEED</span></div>
              <div className="puzzle-body">
                <div className="puzzle-topline"><p className="eyebrow" id="layer-label">ENCRYPTION LAYER 01</p><button className="text-button" id="reset-button" type="button" data-cursor-label="Reset"><span aria-hidden="true">↺</span> RESET INVESTIGATION</button></div>
                <h2 id="mission-title">The signal.</h2>
                <p className="puzzle-description" id="mission-description">Receiving a fresh investigation packet.<br />Your first signal is on its way.</p>
                <div className="cipher-window" id="cipher-window">
                  <div className="cipher-label"><span>ENCRYPTED FRAGMENT</span><span aria-hidden="true">[ RAW ]</span></div>
                  <p className="cipher-text" id="cipher-text">RECEIVING SIGNAL…</p>
                  <div className="cipher-footer"><span id="data-time">03:17:09 UTC</span><span>SOURCE UNKNOWN <span aria-hidden="true">↗</span></span></div>
                </div>
                <div className="clue-box"><span className="clue-icon" aria-hidden="true">↳</span><div><h3>The Lead.</h3><p id="clue-text">Preparing the lead for your investigation.</p></div></div>
                <form id="answer-form" autoComplete="off" noValidate>
                  <label htmlFor="answer-input">YOUR ANSWER <span>CASE INSENSITIVE</span></label>
                  <div className="answer-row">
                    <span className="input-prompt" aria-hidden="true">&gt;_</span>
                    <input id="answer-input" name="answer" type="text" placeholder="Enter your answer…" maxLength={100} spellCheck={false} autoCapitalize="off" aria-describedby="feedback" data-cursor-label="Enter message" />
                    <button className="submit-button" id="decode-button" type="submit" data-cursor-label="Decode">DECODE <span aria-hidden="true">↗</span></button>
                  </div>
                  <p id="feedback" className="feedback" role="status" aria-live="polite" aria-atomic="true">Awaiting your response<span className="cursor" aria-hidden="true">_</span></p>
                </form>
                <div className="puzzle-actions">
                  <button className="secondary-button" id="hint-button" type="button" aria-expanded="false" aria-controls="hint-panel" data-cursor-label="Reveal hint"><span aria-hidden="true">⌁</span> REQUEST HINT <span id="hint-cost">01 AVAILABLE</span></button>
                  <button className="secondary-button" id="note-button" type="button" aria-expanded="false" aria-controls="note-panel" data-cursor-label="Field notes"><span aria-hidden="true">▤</span> FIELD NOTES <span id="note-chevron" aria-hidden="true">+</span></button>
                </div>
                <div className="reveal-panel" id="hint-panel" hidden><h3>DECRYPTION ASSIST</h3><p id="hint-text" /></div>
                <div className="reveal-panel field-note" id="note-panel" hidden><h3>INVESTIGATOR’S FIELD NOTE</h3><p id="note-text" /></div>
                <button className="completion-link" id="view-transmission" type="button" data-cursor-label="Open" hidden>READ THE RECOVERED TRANSMISSION <span aria-hidden="true">↗</span></button>
              </div>
              <div className="puzzle-bottom"><span><span className="tiny-square" /> LOCAL DECRYPTION ENGINE</span><span>v.1.0.26</span></div>
            </section>

            <aside className="log-panel" aria-labelledby="log-heading">
              <div className="section-heading"><h3 id="log-heading">SYSTEM LOG</h3><span className="log-indicator" aria-hidden="true">●</span></div>
              <div className="log-topline"><span>SESSION // 001–A</span><span id="log-count">00 EVENTS</span></div>
              <div id="log-content" className="log-content" role="log" aria-label="Recent system events" aria-live="polite" aria-relevant="additions" tabIndex={0} />
              <div className="log-bottom"><span className="terminal-caret" aria-hidden="true">&gt;_</span><span>LISTENING FOR A SIGNAL<span className="cursor" aria-hidden="true">...</span></span></div>
              <div className="archive-note"><span aria-hidden="true">{"{ N }"}</span><p>“A cipher is a lock; your mind is the key.”</p><small>~Navnisha</small></div>
            </aside>
          </div>
        </section>

        <section className="bottom-strip" aria-label="Investigator tips">
          <p><span className="tip-mark" aria-hidden="true">✳</span><strong>STAY CURIOUS.</strong></p>
          <div className="keyboard-note"><kbd>ENTER</kbd> DECODE <span>/</span> <kbd>?</kbd> HINT <span>/</span> <kbd>ESC</kbd> CLOSE DIALOG</div>
        </section>
        <footer>
          <span className="footer-brand"><span className="footer-wordmark">DECODE</span><span><span className="muted"> / </span>2026</span></span>
          <span className="footer-disclaimer">A FICTIONAL MYSTERY. A VERY REAL CURIOSITY.</span>
        </footer>
      </main>

      <dialog id="completion-dialog" className="archive-dialog" aria-labelledby="completion-title" aria-describedby="final-message">
        <button className="dialog-close" id="close-completion" type="button" aria-label="Close recovered transmission">×</button>
        <div className="dialog-mark" aria-hidden="true">⌁</div>
        <p className="eyebrow">ALL THREE LAYERS DECRYPTED</p>
        <h2 id="completion-title">THE SIGNAL<br />WAS <span>YOU.</span></h2>
        <div className="transmission-text">
          <span>TRANSMISSION // 001–A</span><p id="final-message">“The door is open. Stay.”</p>
          <p>This was never a distress signal. It was an invitation. Someone built this archive for the person who would look past the noise. You followed the pattern. You kept listening.</p>
          <p>Stay curious, investigator.<br />There is always another layer.</p>
          <span className="transmission-signature">— THE UNKNOWN OPERATOR</span>
        </div>
        <div className="final-code"><span>ARCHIVE STATUS</span><strong>RESTORED ✓</strong></div>
        <button id="play-again-button" className="submit-button" type="button">BEGIN AGAIN <span aria-hidden="true">↻</span></button>
        <button id="return-button" className="dialog-return" type="button">RETURN TO THE ARCHIVE</button>
      </dialog>
      <dialog id="about-dialog" className="archive-dialog about-dialog" aria-labelledby="about-title">
        <button className="dialog-close" id="close-about" type="button" aria-label="Close about the archive">×</button>
        <p className="eyebrow about-eyebrow"><span>BEHIND THE INTERFACE</span><span>MADE BY NAVNISHA</span></p>
        <h2 id="about-title">A FICTIONAL<br /><span>DIGITAL MYSTERY.</span></h2>
        <p>DECODE is a small experiment in curiosity. Three fragments, three ways of seeing, and a message hidden in plain sight.</p>
        <p>Each reset generates a fresh packet with three different puzzle types. The entire investigation runs on your device. Progress and your current questions are saved in this browser when local storage is available.</p>
        <p className="about-footnote">A hint from the operator: try <code>/help</code> in the answer terminal. Secrets never cost progress.</p>
        <button id="close-about-bottom" className="submit-button" type="button">BACK TO THE SIGNAL <span aria-hidden="true">↗</span></button>
      </dialog>
      <noscript><p className="noscript">Enable JavaScript to investigate the archive. The puzzles run entirely on your device.</p></noscript>
      <InvestigationController />
    </>
  );
}
