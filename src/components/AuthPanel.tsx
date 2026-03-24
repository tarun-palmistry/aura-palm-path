import { useState } from "react";
import { Sparkles, ScanLine, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type AuthPanelProps = {
  onAuthenticated: () => void;
};

export const AuthPanel = ({ onAuthenticated }: AuthPanelProps) => {
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
        toast.success("Account created! Check your inbox to verify your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, mystic seeker.");
        onAuthenticated();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mystic-glass grid gap-6 rounded-xl p-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <aside className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-5">
        <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
          Start your journey
        </p>
        <h2 className="text-3xl font-semibold">Enter the Oracle Chamber</h2>
        <p className="text-sm text-muted-foreground">Sign in once and keep your readings securely available whenever you return.</p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-primary" aria-hidden="true" /> Camera + upload supported</li>
          <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Structured AI interpretation</li>
          <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" aria-hidden="true" /> Private account-based access</li>
        </ul>
      </aside>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-5">
        <div className="grid grid-cols-2 rounded-lg border border-border/70 bg-card/60 p-1">
          <Button type="button" variant={isSignup ? "ghost" : "mystic"} className="w-full" onClick={() => setIsSignup(false)}>
            Sign in
          </Button>
          <Button type="button" variant={isSignup ? "mystic" : "ghost"} className="w-full" onClick={() => setIsSignup(true)}>
            Create account
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-mystic"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-mystic"
            minLength={6}
            required
          />
        </div>

        <Button disabled={loading} type="submit" variant="hero" className="w-full">
          {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {isSignup ? "Please verify your email before signing in." : "New here? Switch to Create account."}
        </p>
      </form>
    </section>
  );
};
