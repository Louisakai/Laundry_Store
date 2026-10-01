'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShowerHead, Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/#services', label: 'Dịch vụ' },
  { href: '/#pricing', label: 'Bảng giá' },
  { href: '/contact', label: 'Liên hệ' },
];

export function PublicHeader() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-transparent bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
          <ShowerHead className="h-5 w-5 text-primary" />
          <span>Nimble</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Đăng nhập</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Đăng ký</Button>
          </Link>
        </div>

        <button className="md:hidden p-2 -mr-2" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenu && (
        <div className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenu(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t">
            <Link href="/login" className="flex-1" onClick={() => setMobileMenu(false)}>
              <Button variant="outline" className="w-full" size="sm">Đăng nhập</Button>
            </Link>
            <Link href="/register" className="flex-1" onClick={() => setMobileMenu(false)}>
              <Button className="w-full" size="sm">Đăng ký</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
