import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ArrowLeft, FileText } from 'lucide-react';

const sections = [
  { title: 'Chấp nhận điều khoản', content: 'Bằng việc đăng ký và sử dụng dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý với tất cả các điều khoản được nêu trong tài liệu này.' },
  { title: 'Tài khoản người dùng', content: 'Bạn có trách nhiệm bảo mật thông tin tài khoản và mật khẩu. Mọi hoạt động diễn ra từ tài khoản của bạn đều do bạn chịu trách nhiệm.' },
  { title: 'Đặt đơn và thanh toán', content: 'Đơn hàng chỉ được xử lý sau khi xác nhận. Bạn có trách nhiệm cung cấp thông tin chính xác về địa chỉ, số điện thoại và loại dịch vụ mong muốn.' },
  { title: 'Hủy đơn và hoàn tiền', content: 'Việc hủy đơn và hoàn tiền được thực hiện theo chính sách hủy đơn được công bố trên trang web. Mọi yêu cầu hoàn tiền sẽ được xử lý trong vòng 7 ngày làm việc.' },
  { title: 'Quyền riêng tư', content: 'Thông tin cá nhân của bạn được bảo vệ theo chính sách bảo mật. Chúng tôi không chia sẻ thông tin cho bên thứ ba khi chưa có sự đồng ý.' },
  { title: 'Thay đổi điều khoản', content: 'Chúng tôi có quyền cập nhật điều khoản sử dụng bất cứ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="pt-16">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Điều khoản sử dụng</h1>
          </div>
          <p className="text-muted-foreground mb-12 max-w-xl">
            Các điều khoản và điều kiện khi sử dụng dịch vụ của chúng tôi.
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
