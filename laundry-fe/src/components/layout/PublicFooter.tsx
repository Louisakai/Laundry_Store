import Link from 'next/link';
import { ShowerHead } from 'lucide-react';

const supportLinks = [
  { label: 'Câu hỏi thường gặp', href: '/faq' },
  { label: 'Chính sách bảo hành', href: '/warranty' },
  { label: 'Điều khoản sử dụng', href: '/terms' },
  { label: 'Liên hệ', href: '/contact' },
];

export function PublicFooter() {
  return (
    <footer className="border-t bg-card py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-1.5 text-lg font-bold tracking-tight mb-3">
              <ShowerHead className="h-5 w-5 text-primary" />
              <span>Nimble</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Hệ thống đặt lịch giặt ủi trực tuyến. Giao nhận tận nơi, đúng hẹn, giá minh bạch.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Dịch vụ</h4>
            <ul className="space-y-2.5">
              <li><Link href="/#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Giặt sấy</Link></li>
              <li><Link href="/#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Giặt hấp</Link></li>
              <li><Link href="/#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Vệ sinh nệm</Link></li>
              <li><Link href="/#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Giặt thảm</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2.5">
              {supportLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Liên hệ</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>khangb2207526@student.ctu.edu.vn</li>
              <li>083 215 7976</li>
              <li>3 tháng 2, Hưng Lợi, Cần Thơ</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          &copy; 2026 Nimble. Bản quyền thuộc về chúng tôi.
        </div>
      </div>
    </footer>
  );
}
