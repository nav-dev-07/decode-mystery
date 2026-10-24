export const SPLASH_DURATION = 3500;

export function startSplash({ root, splash, page, scrollRoot, body, view, onComplete }) {
  const previousSplashHidden = splash.hidden;
  const previousInert = page.inert;
  const previousOverflow = scrollRoot.style.overflow;
  const previousGutter = scrollRoot.style.scrollbarGutter;
  const previousScrollBehavior = scrollRoot.style.scrollBehavior;
  const previousAnchor = scrollRoot.style.overflowAnchor;
  const history = view.history;
  const previousRestoration = history.scrollRestoration;
  const canControlRestoration = "scrollRestoration" in history;
  const alreadyActive = body.classList.contains("splash-active");
  let finished = false;
  let revealFrame = null;
  let scrollSettingsRestored = false;

  function resetScroll() {
    scrollRoot.scrollTop = 0;
    scrollRoot.scrollLeft = 0;
    body.scrollTop = 0;
    body.scrollLeft = 0;
    view.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function restoreScrollSettings() {
    if (scrollSettingsRestored) return;
    scrollSettingsRestored = true;
    scrollRoot.style.scrollBehavior = previousScrollBehavior;
    scrollRoot.style.overflowAnchor = previousAnchor;
    if (canControlRestoration) history.scrollRestoration = previousRestoration;
  }

  page.inert = true;
  splash.hidden = false;
  scrollRoot.style.scrollbarGutter = "stable";
  scrollRoot.style.overflow = "hidden";
  scrollRoot.style.scrollBehavior = "auto";
  scrollRoot.style.overflowAnchor = "none";
  if (canControlRestoration) history.scrollRestoration = "manual";
  body.classList.add("splash-active");
  root.dataset.phase = "playing";
  resetScroll();

  function release() {
    page.inert = previousInert;
    scrollRoot.style.overflow = previousOverflow;
    scrollRoot.style.scrollbarGutter = previousGutter;
    if (!alreadyActive) body.classList.remove("splash-active");
  }

  const timer = setTimeout(() => {
    finished = true;
    // Hide before dropping the animation selector. React's later unmount must
    // never leave a frame with the splash reset to its opaque initial style.
    splash.hidden = true;
    root.dataset.phase = "ready";
    resetScroll();
    release();
    onComplete();
    // React removes the overlay and reveal animation after onComplete. Correct
    // the scroll again on the next frame, once that final layout is in place.
    revealFrame = view.requestAnimationFrame(() => {
      revealFrame = null;
      resetScroll();
      restoreScrollSettings();
    });
  }, SPLASH_DURATION);

  return () => {
    clearTimeout(timer);
    if (revealFrame !== null) view.cancelAnimationFrame(revealFrame);
    restoreScrollSettings();
    if (!finished) {
      release();
      splash.hidden = previousSplashHidden;
      root.dataset.phase = "loading";
    }
  };
}
