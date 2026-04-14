import { Outlet } from "react-router-dom";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export function SiteLayout() {
  return (
    <div className="layout-shell">
      <SiteHeader />
      <div className="layout-main">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

