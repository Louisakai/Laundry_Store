'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  LogOut,
  ChevronLeft,
  WashingMachine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useEffect } from 'react';

const sidebarItems = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['ADMIN'] },
  { href: '/admin/orders', label: 'Đơn hàng', icon: Package, roles: ['ADMIN', 'STAFF'] },
  { href: '/admin/services', label: 'Dịch vụ', icon: WashingMachine, roles: ['ADMIN'] },
  { href: '/admin/staff', label: 'Nhân viên', icon: Users, roles: ['ADMIN'] },

  { href: '/admin/analytics', label: 'Phân tích', icon: BarChart3, roles: ['ADMIN'] },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const visibleItems = sidebarItems.filter((item) => item.roles.includes(user?.role ?? ''));

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    document.cookie = 'accessToken=; path=/; max-age=0';
    logout();
    router.push('/login');
  };

  const initials = user?.fullName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'A';
  const brandLabel = user?.role === 'ADMIN' ? 'Admin' : 'Staff';

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-background">
        <div className="flex items-center gap-2 px-6 h-16 border-b">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary">Nimble</span>
            <span className="text-muted-foreground">{brandLabel}</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-50 h-16 border-b bg-background/80 backdrop-blur-md flex items-center px-4 md:px-6 gap-4">
          <Link href="/" className="md:hidden flex items-center gap-2 font-semibold">
            <span className="text-primary">Nimble</span>
            <span className="text-muted-foreground">{brandLabel}</span>
          </Link>
          <div className="flex-1" />
          <NotificationBell />
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
