'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Tin nhắn đã được gửi. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.');
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="pt-16">
        <div className="mx-auto max-w-4xl px-4 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>

          <div className="grid gap-12 md:grid-cols-5">
            <div className="md:col-span-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Liên hệ</h1>
              <p className="text-muted-foreground mb-8 max-w-sm">
                Gửi tin nhắn cho chúng tôi — chúng tôi luôn sẵn sàng hỗ trợ bạn.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium mb-0.5">Email</p>
                    <p className="text-sm text-muted-foreground break-all">khangb2207526@student.ctu.edu.vn</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Điện thoại</p>
                    <p className="text-sm text-muted-foreground">083 215 7976</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Địa chỉ</p>
                    <p className="text-sm text-muted-foreground">3 tháng 2, Hưng Lợi, Cần Thơ</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-3">
              {sent ? (
                <div className="rounded-xl border bg-card p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                    <Send className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Đã gửi thành công!</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.
                  </p>
                  <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                    Gửi tin nhắn khác
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Họ tên</Label>
                      <Input id="name" placeholder="Nguyễn Văn A" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="email@example.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Chủ đề</Label>
                    <Input id="subject" placeholder="Hỗ trợ đơn hàng" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Nội dung</Label>
                    <Textarea id="message" rows={5} placeholder="Nhập nội dung tin nhắn..." required />
                  </div>
                  <Button type="submit" className="gap-2">
                    <Send className="h-4 w-4" /> Gửi tin nhắn
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
