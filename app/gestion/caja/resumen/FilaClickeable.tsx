"use client";

import { useRouter } from "next/navigation";

export default function FilaClickeable({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer border-b border-neutral-200 last:border-0 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
    >
      {children}
    </tr>
  );
}
