import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminPanel } from "@/components/AdminPanel";

const Admin = () => {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(Boolean(data));
      setChecking(false);
    };

    check();
  }, []);

  if (checking) {
    return <main className="container py-16">Checking admin access...</main>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="container py-10">
      <div className="mb-6">
        <Button asChild variant="mystic">
          <Link to="/">← Back to Home</Link>
        </Button>
      </div>
      <AdminPanel />
    </main>
  );
};

export default Admin;
