'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useServices } from '@/hooks/useServices';
import { formatCurrency } from '@/lib/utils';
import type { Service } from '@/types';
import { Shirt, Sparkles, Truck, ArrowRight, ChevronRight, WashingMachine } from 'lucide-react';

const offers = [
  {
    icon: Shirt,
    title: 'Giặt ủi chuyên nghiệp',
    desc: 'Giặt sấy, giặt hấp, vệ sinh nệm — xử lý từng chất liệu riêng biệt, đảm bảo đồ luôn như mới.',
  },
  {
    icon: Sparkles,
    title: 'Đặt đơn online',
    desc: 'Chọn dịch vụ, chọn giờ, xác nhận trong 2 phút. Theo dõi trạng thái đơn hàng real-time.',
  },
  {
    icon: Truck,
    title: 'Giao nhận tận nơi',
    desc: 'Nhân viên đến nhận đồ và giao trả tận nhà. Miễn phí giao nhận nội thành.',
  },
];

const steps = [
  { step: '01', title: 'Chọn dịch vụ', desc: 'Chọn gói giặt phù hợp với nhu cầu của bạn' },
  { step: '02', title: 'Đặt lịch', desc: 'Chọn ngày giờ — nhận đồ trong khung giờ bạn chọn' },
  { step: '03', title: 'Giặt sấy', desc: 'Đội ngũ chuyên nghiệp xử lý và giặt sạch' },
  { step: '04', title: 'Giao trả', desc: 'Đồ sạch thơm được giao tận nhà đúng hẹn' },
];

export default function LandingPage() {
  const { data: services, isLoading } = useServices();
  const activeServices = services?.filter((s) => s.isActive) ?? [];
  const maxOrderCount = activeServices.reduce((m, s) => Math.max(m, s.orderCount ?? 0), 0);
  const popularId =
    maxOrderCount > 0
      ? activeServices.find((s) => (s.orderCount ?? 0) === maxOrderCount)?.id
      : undefined;
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-16">
        <img src="/images/banner.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
        <div className="relative mx-auto w-full max-w-7xl px-4 md:px-6 pb-16">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-primary mb-4 tracking-wider uppercase">
              Giặt ủi tận nơi &bull; Giao nhận trong ngày
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Dịch vụ giặt ủi
              <span className="block text-primary mt-2">giao tận nhà</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed max-w-md">
              Đặt lịch trực tuyến, nhân viên đến nhận đồ trong khung giờ bạn chọn. Trả đồ sạch thơm, đúng hẹn.
            </p>
            <div className="flex items-center gap-3 mt-8">
              <Link href="/orders/new">
                <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-sm">
                  Đặt đơn ngay <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#services">
                <Button size="lg" variant="outline" className="text-base px-8 h-12">
                  Tìm hiểu thêm
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-medium text-primary tracking-wider uppercase mb-3">Dịch vụ</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Bên chúng tôi cung cấp</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Từ giặt sấy thông thường đến giặt hấp cao cấp — mọi nhu cầu của bạn đều được đáp ứng.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {offers.map((item) => (
              <div key={item.title} className="group rounded-xl border bg-card p-6 md:p-8 hover:shadow-sm transition-all">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-medium text-primary tracking-wider uppercase mb-3">Cách hoạt động</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Chỉ 4 bước đơn giản</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Từ lúc đặt lịch đến khi nhận đồ — mọi thứ đều được sắp xếp gọn gàng.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, i) => (
              <div key={item.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%-8px)] w-[calc(100%-1.5rem)] h-px border-t border-dashed border-border" />
                )}
                <div className="flex items-start gap-4 lg:flex-col lg:gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/register">
              <Button className="gap-2">Bắt đầu ngay <ChevronRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-medium text-primary tracking-wider uppercase mb-3">Bảng giá</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Giá dịch vụ</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Minh bạch về giá — bạn biết chính xác mình đang trả cho dịch vụ gì.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-6 md:p-8">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-9 w-24 mt-4 mb-5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : activeServices.length > 0 ? (
              activeServices.map((svc) => (
                <PricingCard key={svc.id} service={svc} popular={svc.id === popularId} />
              ))
            ) : (
              <div className="md:col-span-3 rounded-xl border bg-card p-10 text-center text-muted-foreground">
                <WashingMachine className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Chưa có dịch vụ nào. Vui lòng quay lại sau.</p>
              </div>
            )}
          </div>
          <div className="mt-12 text-center text-sm text-muted-foreground">
            Giá có thể thay đổi theo khối lượng và loại vải.{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Đăng ký để xem bảng giá chi tiết
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Sẵn sàng đặt lịch giặt ngay hôm nay?</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-md mx-auto leading-relaxed">
            Đăng ký tài khoản miễn phí và đặt đơn đầu tiên trong 2 phút.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-base px-8 h-12 gap-2">
                Đăng ký ngay <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="text-base px-8 h-12">Đăng nhập</Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function PricingCard({ service, popular }: { service: Service; popular: boolean }) {
  return (
    <div className={`relative rounded-xl border bg-card p-6 md:p-8 ${popular ? 'ring-2 ring-primary shadow-md' : ''}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
          Phổ biến nhất
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
      <div className="mt-3 mb-5">
        <span className="text-3xl font-bold tracking-tight">{formatCurrency(service.pricePerUnit)}</span>
        <span className="text-sm text-muted-foreground ml-1">/ {service.unit}</span>
      </div>
      {service.description ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Liên hệ để biết thêm chi tiết</p>
      )}
      <Link href="/register" className="block mt-6">
        <Button className="w-full gap-2" variant={popular ? 'default' : 'outline'}>Đăng ký sử dụng</Button>
      </Link>
    </div>
  );
}
