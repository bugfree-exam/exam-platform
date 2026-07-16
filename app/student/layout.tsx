import type { ReactNode } from "react";

import { requireStudentPage } from "@/lib/access";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({
  children,
}: StudentLayoutProps) {
  await requireStudentPage();

  return children;
}