import { FloatingPathsBackground } from "@/components/ui/floating-paths";

export default function FloatingPathsDemoPage() {
  return (
    <FloatingPathsBackground
      className="aspect-[16/9] w-full bg-black flex items-center justify-center"
      position={-1}
    />
  );
}
