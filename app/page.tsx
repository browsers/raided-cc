"use client";

import { useState } from "react";
import Claim from "./Claim";
import TiltCard from "./TiltCard";

const FEATURES = [
  {
    title: "Links and widgets",
    body: "Add your TikTok, X, GitHub and Discord. Show a Discord presence snapshot and an X profile widget on the same page.",
  },
  {
    title: "Card controls",
    body: "Set the card's opacity, border and shadow, and turn on a tilt effect that follows the cursor.",
  },
  {
    title: "Discord link previews",
    body: "Pick the title, description, accent color and image people see when your page is pasted into Discord.",
  },
  {
    title: "View counts",
    body: "See how many people opened your page, from your dashboard.",
  },
  {
    title: "Your own images",
    body: "Upload a profile picture and a background. We store them for you.",
  },
];

export default function Home() {
  const [name, setName] = useState("");

  return (
    <>
      <main id="top" className="page">
        <p className="wordmark">raided.cc</p>

        <section className="hero">
          <div className="hero-copy">
            <Claim name={name} onName={setName} />
            <p className="lede">
              One page for your TikTok, X, GitHub and Discord. raided.cc is
              invite-only, so pick your name now and bring a code.
            </p>
          </div>
          <TiltCard name={name} />
        </section>

        <section id="features" className="features">
          <h2 className="features-title">What goes on your page</h2>
          <dl className="feature-list">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <dt>{f.title}</dt>
                <dd>{f.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="footer">
          <p>raided.cc is invite-only. Ask a member for a code.</p>
        </footer>
      </main>

      <nav className="dock" aria-label="Primary">
        <a href="#top">Home</a>
        <a href="#features">Features</a>
        <a href="#claim">Claim a name</a>
      </nav>
    </>
  );
}
