import { useState } from "react";
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
    <form onSubmit={handleSubmit} className="mystic-glass space-y-4 rounded-xl p-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-semibold">Enter the Oracle Chamber</h2>
        <p className="text-sm text-muted-foreground">Sign in to unlock your AI palm readings.</p>
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

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => setIsSignup((v) => !v)}
      >
        {isSignup ? "Already have an account? Sign in" : "Need an account? Create one"}
      </Button>
    </form>
  );
};
