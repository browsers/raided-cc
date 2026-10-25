import MaskedHeading from "@/components/ui/masked-heading";
import { HERO_MEDIA } from "@/lib/hero-media";

export default function MaskedHeadingDemoPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-black p-6">
      <div className="w-full max-w-6xl">
        <MaskedHeading
          text="raided.cc"
          mediaType="video"
          src={HERO_MEDIA}
          fillScale={1.3}
          parallax={34}
          reveal="scale"
          trigger="view"
          spotlight
          spotlightRadius={180}
          outline
          outlineColor="#f5f5f5"
          brightness={1.1}
          textScale={0.13}
          style={{}}
        />
      </div>
    </main>
  );
}
