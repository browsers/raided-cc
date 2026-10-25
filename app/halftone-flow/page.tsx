import HalftoneFlow from "@/components/ui/halftone-flow";

export default function HalftoneFlowDemoPage() {
  return (
    <div className="relative h-svh w-full overflow-hidden bg-black">
      <HalftoneFlow className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xl font-semibold tracking-tight text-white">
          Halftone Flow
        </span>
      </div>
    </div>
  );
}
