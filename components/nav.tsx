"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((it) => {
        const activo = it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              activo ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
