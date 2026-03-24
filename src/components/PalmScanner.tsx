import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Upload, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type ReportRow = Tables<"reports">;

type PalmScannerProps = {
  userId: string;
  onReportReady: (readingId: string, report: ReportRow) => void;
};

const isImageFile = (file: File) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);

export const PalmScanner = ({ userId, onReportReady }: PalmScannerProps) => {
  const { language, t, tm } = useLanguage();
  const [handSide, setHandSide] = useState<"left" | "right">("left");
  const [dominantHand, setDominantHand] = useState<"left" | "right">("right");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState<"camera" | "upload">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"uploading" | "extracting" | "finalizing">("uploading");
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const metadataSchema = useMemo(
    () =>
      z.object({
        handSide: z.enum(["left", "right"]),
        dominantHand: z.enum(["left", "right"]),
        age: z
          .string()
          .optional()
          .transform((v) => (v ? Number(v) : null))
          .refine((v) => v === null || (Number.isFinite(v) && v > 0 && v < 120), "Age must be 1-119"),
        gender: z.string().max(40).optional(),
      }),
    [],
  );

  const scanSteps = tm<string[]>("palm.steps");
  const loadingStageText = {
    uploading: t("common.loading.uploadingPalm"),
    extracting: t("common.loading.extractingLines"),
    finalizing: t("common.loading.finalizingPalmReport"),
  } as const;

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
      toast.error(t("palm.toasts.cameraBlocked"));
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
      toast.error(t("palm.toasts.captureFailed"));
      return;
    }

    const file = new File([blob], `palm-${Date.now()}.jpg`, { type: "image/jpeg" });
    setImageFile(file);
    setImageSource("camera");
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

    throw new Error(t("palm.toasts.analysisSlow"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error(t("palm.toasts.uploadFirst"));
      return;
    }

    if (!isImageFile(imageFile) || imageFile.size > 12 * 1024 * 1024) {
      toast.error(t("palm.toasts.invalidImage"));
      return;
    }

    const parsed = metadataSchema.safeParse({ handSide, dominantHand, age, gender });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("palm.toasts.invalidMetadata"));
      return;
    }

    setIsLoading(true);
    setLoadingStage("uploading");

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
        source: imageSource,
      });

      if (imageInsertError) throw imageInsertError;

      setLoadingStage("extracting");

      const { error: analyzeError } = await supabase.functions.invoke("analyze-palm", {
        body: { readingId: reading.id, language },
      });

      if (analyzeError) throw new Error(analyzeError.message);

      setLoadingStage("finalizing");
      const report = await waitForReport(reading.id);
      onReportReady(reading.id, report);
      toast.success(t("palm.toasts.analyzed"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("palm.toasts.scanFailed");
      toast.error(message);
    } finally {
      setIsLoading(false);
      setLoadingStage("uploading");
    }
  };

  return (
    <section className="mystic-glass space-y-6 rounded-xl p-6">
      <div className="space-y-3">
        <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          {t("palm.badge")}
        </p>
        <h2 className="text-3xl font-semibold">{t("palm.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("palm.subtitle")}</p>
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
            <Label htmlFor="hand-side">{t("palm.handSide")}</Label>
            <select
              id="hand-side"
              className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={handSide}
              onChange={(e) => setHandSide(e.target.value as "left" | "right")}
            >
              <option value="left">{t("palm.left")}</option>
              <option value="right">{t("palm.right")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dominant">{t("palm.dominantHand")}</Label>
            <select
              id="dominant"
              className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={dominantHand}
              onChange={(e) => setDominantHand(e.target.value as "left" | "right")}
            >
              <option value="left">{t("palm.left")}</option>
              <option value="right">{t("palm.right")}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="age">{t("palm.age")}</Label>
            <Input
              id="age"
              type="number"
              placeholder={t("palm.agePlaceholder")}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="focus-mystic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">{t("palm.gender")}</Label>
            <Input
              id="gender"
              placeholder={t("palm.genderPlaceholder")}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="focus-mystic"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="mystic" onClick={startCamera} className="gap-2" disabled={isLoading}>
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t("common.actions.useCamera")}
          </Button>
          <label className="focus-mystic inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("common.actions.uploadImage")}
            <input
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/webp"
              disabled={isLoading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
                if (file) setImageSource("upload");
              }}
            />
          </label>
        </div>

        {cameraOn && (
          <div className="space-y-3 rounded-xl border border-border/70 bg-background/30 p-3">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-border/80" />
            <div className="flex gap-2">
              <Button type="button" variant="hero" onClick={capturePalm} className="gap-2" disabled={isLoading}>
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                {t("common.actions.capturePalm")}
              </Button>
              <Button type="button" variant="mystic" onClick={stopCamera} disabled={isLoading}>
                {t("common.actions.cancel")}
              </Button>
            </div>
          </div>
        )}

        {previewUrl && (
          <div className="space-y-3 rounded-xl border border-border/70 bg-background/30 p-3">
            <img
              src={previewUrl}
              alt={t("palm.previewAlt")}
              className="max-h-[420px] w-full rounded-xl border border-border/80 object-cover"
              loading="lazy"
            />
            <Button type="button" variant="ghost" onClick={() => setImageFile(null)} className="w-fit">
              {t("common.actions.retakeReplace")}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-border/70 bg-background/30 px-4 py-5">
            <CosmicLoader
              variant="section"
              size="medium"
              label={loadingStageText[loadingStage]}
              sublabel={t("common.loading.palmProcessingHint")}
            />
          </div>
        )}

        <Button type="submit" variant="hero" disabled={isLoading} className="w-full gap-2">
          {isLoading ? (
            <>
              <CosmicLoader size="small" variant="button" className="scale-[0.62]" />
              {loadingStageText[loadingStage]}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("common.actions.submitForReading")}
            </>
          )}
        </Button>
      </form>
    </section>
  );
};
