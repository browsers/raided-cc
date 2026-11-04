import ClaimBox from "../components/ClaimBox";
import Dock from "../components/Dock";
import ScrollDots from "../components/ScrollDots";
import WindowLight from "../components/ContourTide";

export default function Home() {
  return (
    <>
      <WindowLight
        className="tides"
        style={{ position: "absolute" }}
        clickRipples={false}
      />
      <main>
        <section className="snap hero" id="section-1">
          <div className="hero__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hero__icon"
              src="/dock.png"
              alt=""
              draggable={false}
            />
            <h1 className="hero__text">raided.cc</h1>
          </div>
          <ClaimBox />
        </section>
        <section className="snap" id="section-2" />
        <section className="snap" id="section-3" />
      </main>
      <ScrollDots />
      <Dock />
    </>
  );
}