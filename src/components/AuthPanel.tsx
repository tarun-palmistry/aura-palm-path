import { useState } from "react";
import { Sparkles, ScanLine, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type AuthPanelProps = {
  onAuthenticated: () => void;
};

export const AuthPanel = ({ onAuthenticated }: AuthPanelProps) => {
  const { t } = useLanguage();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;
        toast.success(t("auth.signupSuccess"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.signinSuccess"));
        onAuthenticated();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.authFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mystic-glass grid gap-6 rounded-xl p-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <aside className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-5">
        <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          {t("auth.badge")}
        </p>
        <h2 className="text-3xl font-semibold">{t("auth.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.description")}</p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-primary" aria-hidden="true" /> {t("auth.benefits.camera")}</li>
          <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> {t("auth.benefits.ai")}</li>
          <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" aria-hidden="true" /> {t("auth.benefits.private")}</li>
        </ul>
      </aside>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-5">
        <div className="grid grid-cols-2 rounded-lg border border-border/70 bg-card/60 p-1">
          <Button type="button" variant={isSignup ? "ghost" : "mystic"} className="w-full" onClick={() => setIsSignup(false)}>
            {t("common.actions.signIn")}
          </Button>
          <Button type="button" variant={isSignup ? "mystic" : "ghost"} className="w-full" onClick={() => setIsSignup(true)}>
            {t("common.actions.createAccount")}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-mystic"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-mystic"
            minLength={6}
            required
          />
        </div>

        <Button disabled={loading} type="submit" variant="hero" className="w-full">
          {loading ? t("auth.loading") : isSignup ? t("common.actions.createAccount") : t("common.actions.signIn")}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {isSignup ? t("auth.signupHint") : t("auth.signinHint")}
        </p>
      </form>
    </section>
  );
};
