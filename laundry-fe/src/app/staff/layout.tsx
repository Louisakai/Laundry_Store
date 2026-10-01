"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useLocationTracker } from "@/hooks/useStaff";
import { cn } from "@/lib/utils";
import { Package, Map, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect } from "react";

const sidebarItems = [
  { href: "/staff", label: "Đơn hàng", icon: Package },
  { href: "/staff/route", label: "Lộ trình", icon: Map },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== "STAFF") {
      router.push("/");
    }
  }, [user, router]);

  useLocationTracker(
    user?.staffType === "SHIPPER" && user?.isAvailable === true,
  );

  const handleLogout = () => {
    document.cookie = "accessToken=; path=/; max-age=0";
    logout();
    router.push("/login");
  };

  const initials =
    user?.fullName
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden md:flex md:w-56 flex-col border-r bg-background">
        <div className="flex items-center gap-2 px-6 h-16 border-b">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary">Nimble</span>
            <span className="text-muted-foreground">Staff</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.staffType}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-50 h-14 md:h-16 border-b bg-background/80 backdrop-blur-md flex items-center px-4 md:px-6 gap-4">
          <Link
            href="/staff"
            className="md:hidden flex items-center gap-2 font-semibold min-w-0"
          >
            <span className="text-primary">Nimble</span>
            <span className="text-muted-foreground">Staff</span>
          </Link>
          <div className="flex-1" />
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-6 overflow-auto">
          {children}
        </main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur-md px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-2 gap-2 py-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
