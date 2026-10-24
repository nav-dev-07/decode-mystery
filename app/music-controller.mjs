// Browsers may require a user gesture before playing unmuted audio. Try on load,
// then retry from the first interaction without overriding an explicit mute.
export function createMusicController(audio, { eventTarget, onChange, onError }) {
  let enabled = true;
  let awaitingGesture = false;
  let disposed = false;
  let generation = 0;
  let reportedError = false;

  audio.loop = true;
  audio.volume = 0.35;

  function reportError(error) {
    if (reportedError) return;
    reportedError = true;
    onError?.(error);
  }

  async function play(automatic = false) {
    const request = ++generation;
    enabled = true;
    awaitingGesture = false;
    onChange(true);
    try {
      await audio.play();
      if (disposed || request !== generation) {
        if (disposed || !enabled) audio.pause();
        return;
      }
      reportedError = false;
    } catch (error) {
      if (disposed || request !== generation) return;
      enabled = false;
      awaitingGesture = automatic && error?.name === "NotAllowedError";
      onChange(false);
      if (!awaitingGesture && error?.name !== "AbortError") reportError(error);
    }
  }

  function retryAfterGesture(event) {
    if (disposed || !awaitingGesture || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    // The Sound button handles its own click; a gesture retry must not turn it
    // on just before the button's click handler turns it back off.
    if (event.target?.closest?.("#sound-toggle")) return;
    void play(true);
  }

  function handleError() {
    if (disposed) return;
    generation += 1;
    enabled = false;
    awaitingGesture = false;
    audio.pause();
    onChange(false);
    reportError(audio.error);
  }

  eventTarget.addEventListener("pointerdown", retryAfterGesture, { passive: true });
  eventTarget.addEventListener("pointerup", retryAfterGesture, { passive: true });
  eventTarget.addEventListener("click", retryAfterGesture);
  eventTarget.addEventListener("keydown", retryAfterGesture);
  audio.addEventListener("error", handleError);
  void play(true);

  return {
    toggle() {
      if (disposed) return;
      awaitingGesture = false;
      if (enabled) {
        generation += 1;
        enabled = false;
        audio.pause();
        onChange(false);
      } else {
        void play();
      }
    },
    destroy() {
      disposed = true;
      generation += 1;
      enabled = false;
      awaitingGesture = false;
      eventTarget.removeEventListener("pointerdown", retryAfterGesture);
      eventTarget.removeEventListener("pointerup", retryAfterGesture);
      eventTarget.removeEventListener("click", retryAfterGesture);
      eventTarget.removeEventListener("keydown", retryAfterGesture);
      audio.removeEventListener("error", handleError);
      audio.pause();
    },
  };
}
