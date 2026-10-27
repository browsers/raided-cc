"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SVGProps,
} from "react";

type OutputMime = "image/png" | "image/jpeg" | "image/webp" | "image/avif";
type Status = "idle" | "converting" | "done" | "error";

type Format = {
  mime: OutputMime;
  label: string;
  ext: string;
};

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  source: string;
  target: OutputMime;
  status: Status;
  outputUrl?: string;
  outputName?: string;
  error?: string;
};

const BASE_FORMATS: Format[] = [
  { mime: "image/png", label: "PNG", ext: "png" },
  { mime: "image/jpeg", label: "JPG", ext: "jpg" },
  { mime: "image/webp", label: "WEBP", ext: "webp" },
];

const AVIF_FORMAT: Format = { mime: "image/avif", label: "AVIF", ext: "avif" };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceLabel(file: File) {
  const mime = file.type.toLowerCase();
  if (mime === "image/svg+xml") return "SVG";
  if (mime.startsWith("image/")) {
    const subtype = mime.slice(6);
    if (subtype === "jpeg") return "JPG";
    return subtype.toUpperCase();
  }
  const extension = file.name.split(".").pop();
  return extension ? extension.toUpperCase() : "FILE";
}

function isImage(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|avif|svg|bmp|tiff?|heic|heif)$/i.test(file.name)
  );
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

function chooseTarget(sourceMime: string, formats: Format[]) {
  if (sourceMime === "image/png") {
    const webp = formats.find((format) => format.mime === "image/webp");
    if (webp) return webp.mime;
  }
  return (formats.find((format) => format.mime === "image/png") ?? formats[0]).mime;
}

async function convertFile(file: File, target: OutputMime) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read this image."));
      element.src = url;
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("This image has no dimensions.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    if (target === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, target, target === "image/png" ? undefined : 0.92);
    });
    if (!blob) throw new Error("Could not encode this image.");
    if (blob.type !== target) {
      throw new Error("This output format is not supported by your browser.");
    }
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function CloudUploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <mask
        id="cloud-upload-cut"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="64"
        height="64"
      >
        <rect width="64" height="64" fill="white" />
        <path
          d="M32 23L42 34H36.5V49H27.5V34H22L32 23Z"
          fill="black"
        />
      </mask>
      <path
        d="M17.5 49C10.6 49 5 43.6 5 37C5 30.8 9.6 25.7 15.6 24.8C17.1 16.4 23.5 10 32 10C40.7 10 47.6 16.6 48.2 24.9C55 25.8 60 31.1 60 37.5C60 43.8 54.6 49 48 49H17.5Z"
        fill="currentColor"
        mask="url(#cloud-upload-cut)"
      />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M8 3.25V12.75M3.25 8H12.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M13 5.5A5.5 5.5 0 1 0 13.4 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 2.75V6H9.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M8 2.75V10.25M5 7.5L8 10.5L11 7.5M3 12.75H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <rect x="2" y="3" width="12" height="10" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.5" cy="6.25" r="1" fill="currentColor" />
      <path d="M2.75 11L6 8L8.25 10.25L10 8.5L13.25 11.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M4 6.25L8 10.25L12 6.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileRow({
  item,
  formats,
  onTargetChange,
  onConvert,
  onDownload,
  onRemove,
}: {
  item: Item;
  formats: Format[];
  onTargetChange: (id: string, target: OutputMime) => void;
  onConvert: (id: string) => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const action =
    item.status === "done" ? "Download" : item.status === "error" ? "Retry" : "Convert";

  return (
    <div className="flex flex-wrap items-center gap-3 border border-[#2a2c30] bg-[#202124] px-3 py-3 sm:px-4">
      <div className="h-10 w-10 shrink-0 border border-[#303338] bg-[#292b2e]">
        <img
          src={item.previewUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#e5e7e9]">{item.name}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-[#858990]">
          {formatBytes(item.size)} · {item.source} image
        </p>
        {item.error ? (
          <p className="mt-1 text-[11px] leading-4 text-[#c98d8d]">{item.error}</p>
        ) : null}
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <span className="hidden h-8 items-center gap-1.5 border border-[#3a3d42] bg-[#2a2c2f] px-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#d4d6d9] sm:inline-flex">
          <ImageIcon className="size-3" />
          {item.source}
        </span>
        <ArrowRightIcon className="size-3.5 shrink-0 text-[#74787e]" />
        <div className="relative">
          <select
            value={item.target}
            onChange={(event) =>
              onTargetChange(item.id, event.target.value as OutputMime)
            }
            aria-label={`Convert ${item.name} to`}
            disabled={item.status === "converting"}
            className="h-8 w-[88px] appearance-none border border-[#3a3d42] bg-[#141518] pl-2.5 pr-7 text-[11px] font-medium uppercase tracking-[0.06em] text-[#d7d9dc] outline-none focus:border-[#5a5e64] disabled:opacity-50"
          >
            {formats.map((entry) => (
              <option key={entry.mime} value={entry.mime}>
                {entry.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#858990]" />
        </div>
        <button
          type="button"
          onClick={() =>
            item.status === "done" ? onDownload(item.id) : onConvert(item.id)
          }
          disabled={item.status === "converting"}
          className="inline-flex h-8 items-center gap-1.5 px-1.5 text-[12px] text-[#c7cacf] hover:text-white disabled:opacity-60"
        >
          {item.status === "done" ? (
            <DownloadIcon className="size-3.5" />
          ) : (
            <RefreshIcon
              className={`size-3.5 ${item.status === "converting" ? "animate-spin" : ""}`}
            />
          )}
          {action}
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="inline-flex h-8 w-7 items-center justify-center text-[#74787e] hover:text-[#dfe1e4]"
          aria-label={`Remove ${item.name}`}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function ImageConverter() {
  const [items, setItems] = useState<Item[]>([]);
  const [formats, setFormats] = useState<Format[]>(BASE_FORMATS);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    let active = true;
    canvas.toBlob(
      (blob) => {
        if (active && blob?.type === "image/avif") {
          setFormats([...BASE_FORMATS, AVIF_FORMAT]);
        }
      },
      "image/avif",
      0.9,
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      });
    };
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter(isImage);
      if (!incoming.length) return;
      setItems((current) => [
        ...current,
        ...incoming.map((file) => ({
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          source: sourceLabel(file),
          target: chooseTarget(file.type, formats),
          status: "idle" as const,
        })),
      ]);
    },
    [formats],
  );

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  const updateItem = (id: string, update: Partial<Item>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  };

  const handleTargetChange = (id: string, target: OutputMime) => {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    updateItem(id, {
      target,
      status: "idle",
      outputUrl: undefined,
      outputName: undefined,
      error: undefined,
    });
  };

  const handleConvert = async (id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    const target = item.target;
    updateItem(id, { status: "converting", error: undefined });
    try {
      const blob = await convertFile(item.file, target);
      const current = itemsRef.current.find((entry) => entry.id === id);
      if (!current || current.target !== target) {
        return;
      }
      if (current.outputUrl) URL.revokeObjectURL(current.outputUrl);
      const format = formats.find((entry) => entry.mime === target) ?? formats[0];
      updateItem(id, {
        status: "done",
        outputUrl: URL.createObjectURL(blob),
        outputName: `${baseName(item.name)}.${format.ext}`,
        error: undefined,
      });
    } catch (error) {
      updateItem(id, {
        status: "error",
        error: error instanceof Error ? error.message : "Conversion failed.",
      });
    }
  };

  const handleDownload = (id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item?.outputUrl || !item.outputName) return;
    const link = document.createElement("a");
    link.href = item.outputUrl;
    link.download = item.outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleRemove = (id: string) => {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  const handleClear = () => {
    setItems((current) => {
      current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      });
      return [];
    });
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-[#09090a] p-3 sm:p-5 lg:p-8">
      <section
        className={`flex h-[62svh] min-h-[340px] w-full flex-col overflow-hidden border transition-colors duration-150 ${
          dragging
            ? "border-[#555960] bg-[#1d1e21]"
            : "border-[#24262a] bg-[#191a1c]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.webp,.avif,.heic,.heif,.svg"
          multiple
          onChange={handleInput}
          className="hidden"
        />
        {items.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            className="group flex flex-1 flex-col items-center justify-center px-6 text-center outline-none"
          >
            <CloudUploadIcon className="h-[52px] w-[56px] text-[#686c72] transition-colors group-hover:text-[#7d8187] group-focus-visible:text-[#7d8187]" />
            <p className="mt-5 text-[15px] font-medium text-[#d4d6d9]">No files yet</p>
            <p className="mt-1.5 text-[13px] text-[#858990]">
              Add files below or drop them anywhere.
            </p>
          </button>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <FileRow
                  key={item.id}
                  item={item}
                  formats={formats}
                  onTargetChange={handleTargetChange}
                  onConvert={handleConvert}
                  onDownload={handleDownload}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex h-12 shrink-0 items-center justify-between border-t border-[#25272b] px-3 sm:px-4">
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-2 text-[12px] font-medium text-[#cdd0d4] hover:text-white"
          >
            <PlusIcon className="size-3.5" />
            Add files
          </button>
          <div className="flex items-center gap-4 text-[11px] text-[#777b81]">
            {items.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-[#cdd0d4]"
              >
                Clear
              </button>
            ) : null}
            <span>
              {items.length > 0
                ? `${items.length} file${items.length === 1 ? "" : "s"}`
                : formats.map((format) => format.label).join(" / ")}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
