import DitherMedia from "@/components/DitherMedia";

export default function Home() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
      }}
    >
      <DitherMedia
        src="/dither-rose.jpg"
        mediaType="image"
        cellSize={10}
        characters=" .-=+*e2%@"
        colorMode="monochrome"
        textColor="#e8e4dc"
        backgroundColor="#000000"
        brightness={1.45}
        contrast={1.12}
        fit="cover"
        animate
      />
    </main>
  );
}
