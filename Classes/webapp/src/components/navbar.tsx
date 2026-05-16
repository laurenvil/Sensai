"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { clsx } from "clsx";
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  FileText,
  LogIn,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useTeacherStatus } from "@/hooks/use-admin-status";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/ai", label: "AI Assistant", icon: MessageSquare },
  { href: "/docs", label: "Docs", icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isTeacher } = useTeacherStatus();

  const allNavItems = isTeacher
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: Shield }]
    : NAV_ITEMS;

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span>gitClasses</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              const isAdminLink = item.href === "/admin";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? isAdminLink
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex md:items-center md:gap-3">
            {status === "loading" ? (
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            ) : session ? (
              <div className="flex items-center gap-3">
                <img
                  src={session.user?.image || ""}
                  alt={session.user?.name || ""}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium">
                  {session.user?.githubUsername}
                </span>
                {isTeacher && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    Teacher
                  </span>
                )}
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("github")}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <LogIn className="h-4 w-4" />
                Sign in with GitHub
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-gray-200 dark:border-gray-800 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              {session ? (
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => signIn("github")}
                  className="flex w-full items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in with GitHub
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
