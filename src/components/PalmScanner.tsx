import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Upload, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ReportRow = Tables<"reports">;

type PalmScannerProps = {
  userId: string;
  onReportReady: (readingId: string, report: ReportRow) => void;
};

const metadataSchema = z.object({
  handSide: z.enum(["left", "right"]),
  dominantHand: z.enum(["left", "right"]),
  age: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v > 0 && v < 120), "Age must be 1-119"),
  gender: z.string().max(40).optional(),
});

const isImageFile = (file: File) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);

const scanSteps = ["Capture or upload your palm", "Provide hand metadata", "Get your full reading in minutes"];

export const PalmScanner = ({ userId, onReportReady }: PalmScannerProps) => {
  const [handSide, setHandSide] = useState<"left" | "right">("left");
  const [dominantHand, setDominantHand] = useState<"left" | "right">("right");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [previewUrl]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch {
      toast.error("Camera access is blocked. Please use upload instead.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capturePalm = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) {
      toast.error("Could not capture image. Try again.");
      return;
    }

    const file = new File([blob], `palm-${Date.now()}.jpg`, { type: "image/jpeg" });
    setImageFile(file);
    stopCamera();
  };

  const waitForReport = async (readingId: string) => {
    for (let i = 0; i < 18; i += 1) {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reading_id", readingId)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;
      await new Promise((resolve) => setTimeout(resolve, 1400));
    }

    throw new Error("Analysis is taking longer than expected. Please refresh in a moment.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error("Please upload or capture a palm image first.");
      return;
    }

    if (!isImageFile(imageFile) || imageFile.size > 12 * 1024 * 1024) {
      toast.error("Use a clear JPG/PNG/WEBP image under 12MB.");
      return;
    }

    const parsed = metadataSchema.safeParse({ handSide, dominantHand, age, gender });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid metadata.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: reading, error: readingError } = await supabase
        .from("palm_readings")
        .insert({
          user_id: userId,
          hand_side: parsed.data.handSide,
          dominant_hand: parsed.data.dominantHand,
          age: parsed.data.age,
          gender: parsed.data.gender || null,
          analysis_status: "processing",
        })
        .select("id")
        .single();

      if (readingError) throw readingError;

      const ext = imageFile.name.split(".").pop() || "jpg";
      const storagePath = `${userId}/${reading.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("palm-images").upload(storagePath, imageFile, {
        contentType: imageFile.type,
      });

      if (uploadError) throw uploadError;

      const { error: imageInsertError } = await supabase.from("images").insert({
        user_id: userId,
        reading_id: reading.id,
        storage_path: storagePath,
        source: cameraOn ? "camera" : "upload",
      });

      if (imageInsertError) throw imageInsertError;

      const { error: analyzeError } = await supabase.functions.invoke("analyze-palm", {
        body: { readingId: reading.id },
      });

      if (analyzeError) throw new Error(analyzeError.message);

      const report = await waitForReport(reading.id);
      onReportReady(reading.id, report);
      toast.success("Your palm has been analyzed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete scan.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mystic-glass space-y-6 rounded-xl p-6">
      <div className="space-y-3">
        <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          Palm scanner
        </p>
        <h2 className="text-3xl font-semibold">Scan My Palm</h2>
        <p className="text-sm text-muted-foreground">Upload or capture your palm with clear lighting, then submit for feature extraction and interpretation.</p>
        <div className="grid gap-2 md:grid-cols-3">
          {scanSteps.map((step, index) => (
            <div key={step} className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">0{index + 1}</span> {step}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hand-side">Left or Right hand</Label>
            <select
              id="hand-side"
              className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={handSide}
              onChange={(e) => setHandSide(e.target.value as "left" | "right")}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dominant">Dominant hand</Label>
            <select
              id="dominant"
              className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={dominantHand}
              onChange={(e) => setDominantHand(e.target.value as "left" | "right")}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="age">Age (optional)</Label>
            <Input
              id="age"
              type="number"
              placeholder="e.g., 29"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="focus-mystic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender (optional)</Label>
            <Input
              id="gender"
              placeholder="e.g., female"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="focus-mystic"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="mystic" onClick={startCamera} className="gap-2">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Use Camera
          </Button>
          <label className="focus-mystic inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload Image
            <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        {cameraOn && (
          <div className="space-y-3 rounded-xl border border-border/70 bg-background/30 p-3">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-border/80" />
            <div className="flex gap-2">
              <Button type="button" variant="hero" onClick={capturePalm} className="gap-2">
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                Capture Palm
              </Button>
              <Button type="button" variant="mystic" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {previewUrl && (
          <div className="space-y-3 rounded-xl border border-border/70 bg-background/30 p-3">
            <img
              src={previewUrl}
              alt="Palm preview"
              className="max-h-[420px] w-full rounded-xl border border-border/80 object-cover"
              loading="lazy"
            />
            <Button type="button" variant="ghost" onClick={() => setImageFile(null)} className="w-fit">
              Retake / Replace
            </Button>
          </div>
        )}

        <Button type="submit" variant="hero" disabled={isLoading} className="w-full gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Analyzing your palm..." : "Submit for Reading"}
        </Button>
      </form>
    </section>
  );
};
