/**
 * Full-viewport ambient background: blurred restaurant photography + tech “flow” layers.
 * Photo: Unsplash (restaurant interior) — see public/landing/README.md for attribution.
 */
export function LandingBackdrop(): React.ReactElement {
  return (
    <div className="qrt-landing__bg" aria-hidden>
      <div className="qrt-landing__bg-photo" />
      <div className="qrt-landing__bg-scanlines" />
      <div className="qrt-landing__bg-mesh" />
      <div className="qrt-landing__bg-flow" />
      <div className="qrt-landing__bg-veil" />
    </div>
  );
}
