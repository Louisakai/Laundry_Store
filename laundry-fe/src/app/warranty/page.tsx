import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const sections = [
  { title: 'Cam kết chất lượng', content: 'Chúng tôi cam kết sử dụng hóa chất giặt ủi an toàn, thiết bị hiện đại và quy trình kiểm soát chất lượng nghiêm ngặt cho mọi đơn hàng.' },
  { title: 'Bồi thường hư hại', content: 'Trong trường hợp đồ giặt bị hư hại (rách, phai màu, co rút) do lỗi từ quy trình của chúng tôi, chúng tôi sẽ bồi thường 100% giá trị sản phẩm dựa trên hóa đơn mua hàng hoặc giá thị trường tại thời điểm bồi thường.' },
  { title: 'Mất đồ', content: 'Nếu phát hiện thiếu đồ sau khi nhận, vui lòng thông báo trong vòng 24 giờ. Chúng tôi sẽ truy tìm và bồi thường nếu không tìm thấy.' },
  { title: 'Khiếu nại', content: 'Mọi khiếu nại về chất lượng dịch vụ được giải quyết trong vòng 48 giờ làm việc kể từ khi nhận được thông báo.' },
  { title: 'Trường hợp ngoại lệ', content: 'Chúng tôi không chịu trách nhiệm với các trường hợp: đồ có nhãn không giặt khô nhưng khách yêu cầu giặt khô, đồ đã có dấu hiệu hư hỏng từ trước, hoặc thiên tai/sự kiện bất khả kháng.' },
];

export default function WarrantyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="pt-16">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Chính sách bảo hành</h1>
          </div>
          <p className="text-muted-foreground mb-12 max-w-xl">
            Cam kết chất lượng dịch vụ và bồi thường khi có sự cố.
          </p>

          <div className="space-y-10">
            {sections.map((section, i) => (
              <div key={i} className="border-b border-border pb-8 last:border-0">
                <h2 className="font-semibold text-lg mb-2">
                  <span className="text-primary mr-2">{i + 1}.</span>
                  {section.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
