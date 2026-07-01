export function installPageZoomGuards() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const preventGesture = (event) => {
    event.preventDefault();
  };

  const preventMultiTouchZoom = (event) => {
    if (event.touches?.length > 1) {
      event.preventDefault();
    }
  };

  const preventTrackpadZoom = (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  };

  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
  document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false });
  window.addEventListener("wheel", preventTrackpadZoom, { passive: false });
}
