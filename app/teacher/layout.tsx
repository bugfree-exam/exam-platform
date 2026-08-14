import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { requireTeacherPage } from "@/lib/access";

type TeacherLayoutProps = {
  children: ReactNode;
};

export default async function TeacherLayout({ children }: TeacherLayoutProps) {
  await requireTeacherPage();

  return (
    <div className="mobile-app-shell">
      {children}
      <MobileBottomNav role="teacher" />
    </div>
  );
}
