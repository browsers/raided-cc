"use client";

import { useEffect, useRef, useState } from "react";

// Full-screen profile background. A video autoplays muted behind the page; a
// blurred black "Click to enter" splash sits on top until the visitor clicks,
// which is also what lets the browser play the video's audio.
export default function ProfileBackdrop({
  src,
  kind,
}: {
  src: string;
  kind: "image" | "video";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = kind === "video";
  const [entered, setEntered] = useState(!isVideo); // starts the fade-out
  const [gone, setGone] = useState(!isVideo); // removes the splash afterwards

  // Browsers only autoplay muted video, so make sure it's muted, then play.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  const enter = () => {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.play().catch(() => {});
    }
    setEntered(true);
  };

  return (
    <>
      {isVideo ? (
        <video
          ref={videoRef}
          className="profile__bg"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="profile__bg" src={src} alt="" draggable={false} />
      )}

      {!gone && (
        <button
          type="button"
          className="splash"
          data-leaving={entered}
          onClick={enter}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && entered) setGone(true);
          }}
          aria-label="Click to enter"
        >
          <span className="splash__text">Click to enter</span>
        </button>
      )}
    </>
  );
}
