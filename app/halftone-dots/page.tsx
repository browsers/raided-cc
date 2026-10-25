import { ShaderBackground } from "@/components/ui/halftone-dots-mosaic";

export default function HalftoneDotsDemoPage() {
  return (
    <div className="relative h-svh w-full overflow-hidden">
      <ShaderBackground className="absolute inset-0 h-full w-full" />
    </div>
  );
}
