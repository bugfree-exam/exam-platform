import type { ReactNode } from "react";

import { requireTeacherPage } from "@/lib/access";

type TeacherLayoutProps = {
  children: ReactNode;
};

export default async function TeacherLayout({
  children,
}: TeacherLayoutProps) {
  await requireTeacherPage();

  return children;
}