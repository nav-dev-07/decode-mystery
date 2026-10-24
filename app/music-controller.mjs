// Browsers may require a user gesture before playing unmuted audio. Try on load,
// then retry from the first interaction without overriding an explicit mute.
// `enabled` is the user's preference, not whether a play request has resolved.
export function createMusicController(audio, { eventTarget, onChange, onError }) {
  let enabled = true;
  let awaitingGesture = false;
  let disposed = false;
  let generation = 0;
  let reportedError = false;

  audio.loop = true;
  audio.volume = 0.35;
  audio.autoplay = true;
  audio.muted = false;

  function reportError(error) {
    if (reportedError) return;
    reportedError = true;
    onError?.(error);
  }

  async function play() {
    if (disposed || !enabled) return;
    const request = ++generation;
    awaitingGesture = false;
    try {
      await audio.play();
      if (disposed || request !== generation) {
        if (disposed || !enabled) audio.pause();
        return;
      }
      reportedError = false;
    } catch (error) {
      if (disposed || request !== generation) return;
      awaitingGesture = error?.name === "NotAllowedError";
      if (!awaitingGesture && error?.name !== "AbortError") reportError(error);
    }
  }

  function retryAfterGesture(event) {
    if (disposed || !enabled || !awaitingGesture || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    // The Sound button handles its own click; a gesture retry must not turn it
    // on just before the button's click handler turns it back off.
    if (event.target?.closest?.("#sound-toggle")) return;
    void play();
  }

  function handleError() {
    if (disposed) return;
    generation += 1;
    awaitingGesture = false;
    audio.pause();
    reportError(audio.error);
  }

  eventTarget.addEventListener("pointerdown", retryAfterGesture, { passive: true });
  eventTarget.addEventListener("pointerup", retryAfterGesture, { passive: true });
  eventTarget.addEventListener("click", retryAfterGesture);
  eventTarget.addEventListener("keydown", retryAfterGesture);
  audio.addEventListener("error", handleError);
  onChange(true);
  void play();

  return {
    toggle() {
      if (disposed) return;
      awaitingGesture = false;
      if (enabled) {
        generation += 1;
        enabled = false;
        audio.autoplay = false;
        audio.muted = true;
        audio.pause();
        onChange(false);
      } else {
        enabled = true;
        audio.autoplay = true;
        audio.muted = false;
        onChange(true);
        void play();
      }
    },
    destroy() {
      disposed = true;
      generation += 1;
      enabled = false;
      awaitingGesture = false;
      audio.autoplay = false;
      audio.muted = true;
      eventTarget.removeEventListener("pointerdown", retryAfterGesture);
      eventTarget.removeEventListener("pointerup", retryAfterGesture);
      eventTarget.removeEventListener("click", retryAfterGesture);
      eventTarget.removeEventListener("keydown", retryAfterGesture);
      audio.removeEventListener("error", handleError);
      audio.pause();
    },
  };
}
