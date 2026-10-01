import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ArrowLeft, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'Làm thế nào để đặt đơn giặt ủi?',
    a: 'Bạn chỉ cần đăng ký tài khoản, chọn dịch vụ mong muốn, chọn khung giờ nhận đồ và xác nhận. Nhân viên sẽ đến tận nơi nhận đồ trong khung giờ bạn đã chọn.',
  },
  {
    q: 'Thời gian giặt và trả đồ bao lâu?',
    a: 'Thông thường từ 24-48 giờ tùy vào loại dịch vụ. Chúng tôi luôn cam kết trả đồ đúng hẹn.',
  },
  {
    q: 'Có được miễn phí giao nhận không?',
    a: 'Miễn phí giao nhận trong nội thành cho tất cả đơn hàng. Khu vực ngoại thành có thể áp dụng phí bổ sung.',
  },
  {
    q: 'Làm gì nếu đồ bị hư hại trong quá trình giặt?',
    a: 'Chúng tôi cam kết bồi thường 100% giá trị nếu đồ bị hư hại do lỗi từ quy trình giặt ủi của chúng tôi.',
  },
  {
    q: 'Có thể hủy đơn hàng không?',
    a: 'Bạn có thể hủy đơn hàng miễn phí trước khi nhân viên đến nhận đồ. Sau đó, có thể áp dụng phí hủy tùy vào tiến độ đơn hàng.',
  },
  {
    q: 'Thanh toán như thế nào?',
    a: 'Chúng tôi chấp nhận thanh toán khi nhận đồ (COD) và chuyển khoản ngân hàng.',
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="pt-16">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Câu hỏi thường gặp</h1>
          </div>
          <p className="text-muted-foreground mb-12 max-w-xl">
            Những thắc mắc phổ biến về dịch vụ giặt ủi của chúng tôi.
          </p>

          <div className="space-y-10">
            {faqs.map((item, i) => (
              <div key={i} className="border-b border-border pb-8 last:border-0">
                <h2 className="font-semibold text-lg mb-2 flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                    {i + 1}
                  </span>
                  {item.q}
                </h2>
                <p className="text-muted-foreground leading-relaxed ml-9">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
