import { ShaderMetal } from "@/components/ui/shader-metal";

export default function ShaderMetalDemoPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-black p-4">
      <div className="relative aspect-[16/9] min-h-[360px] w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-black">
        <ShaderMetal
          metal="chrome"
          color="#ff001a"
          ribbons={3}
          speed={0.19}
          iridescence={0}
          interactive
        />
      </div>
    </div>
  );
}
