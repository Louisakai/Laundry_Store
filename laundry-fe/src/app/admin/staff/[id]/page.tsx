'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/useStaff';
import { useStaffReviews } from '@/hooks/useReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  formatDate,
  statusLabels,
  statusBadgeVariant,
  cn,
} from '@/lib/utils';
import { ArrowLeft, WashingMachine, Truck, Package, MapPin, KeyRound, Trash2, Star, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminStaffDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: staff, isLoading } = useStaff(params.id);
  const { data: reviews, isLoading: loadingReviews } = useStaffReviews(params.id);
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const [showResetPw, setShowResetPw] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleToggleAvailable = async () => {
    try {
      await updateStaff.mutateAsync({
        id: params.id,
        data: { isAvailable: !staff?.isAvailable },
      });
      toast.success('Cập nhật trạng thái thành công');
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!staff) {
    return (
      <Card className="p-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium">Không tìm thấy nhân viên</p>
      </Card>
    );
  }

  const StaffIcon: LucideIcon = staff.staffType === 'WASHER' ? WashingMachine : Truck;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/staff')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <StaffIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{staff.fullName}</h1>
            <p className="text-sm text-muted-foreground">{staff.email}</p>
          </div>
        </div>
        <Badge
          className={staff.isAvailable ? 'bg-green-100 text-green-700' : ''}
          variant={staff.isAvailable ? 'default' : 'secondary'}
        >
          {staff.isAvailable ? 'Đang hoạt động' : 'Offline'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SĐT</span>
              <span>{staff.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loại NV</span>
              <span>{staff.staffType === 'WASHER' ? 'Thợ giặt' : 'Shipper'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Khu vực</span>
              <span>{staff.workZone || 'Chưa xác định'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày tạo</span>
              <span>{staff.created_at ? formatDate(staff.created_at) : 'N/A'}</span>
            </div>
            <Button
              variant={staff.isAvailable ? 'outline' : 'default'}
              size="sm"
              className="w-full mt-2"
              onClick={handleToggleAvailable}
            >
              {staff.isAvailable ? 'Đặt offline' : 'Bật hoạt động'}
            </Button>

            <div className="border-t pt-3 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => { setShowResetPw(!showResetPw); setNewPassword(''); }}
              >
                <KeyRound className="h-4 w-4 mr-1" /> Đặt lại mật khẩu
              </Button>
              {showResetPw && (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="password"
                    placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={newPassword.length < 6 || updateStaff.isPending}
                    onClick={async () => {
                      try {
                        await updateStaff.mutateAsync({
                          id: params.id,
                          data: { password: newPassword },
                        });
                        toast.success('Đặt lại mật khẩu thành công');
                        setShowResetPw(false);
                        setNewPassword('');
                      } catch {
                        toast.error('Đặt lại mật khẩu thất bại');
                      }
                    }}
                  >
                    Lưu
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Xác nhận xóa nhân viên ${staff.fullName}?`)) {
                    deleteStaff.mutateAsync(params.id).then(() => {
                      toast.success('Xóa nhân viên thành công');
                      router.push('/admin/staff');
                    }).catch((err) => {
                      toast.error(err?.response?.data?.message || 'Xóa nhân viên thất bại');
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Xóa nhân viên
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Vị trí gần nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staff.currentLat && staff.currentLng ? (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Lat:</span> {staff.currentLat}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Lng:</span> {staff.currentLng}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cập nhật: {staff.locationUpdatedAt ? formatDate(staff.locationUpdatedAt) : 'Chưa có'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu vị trí</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.ordersAsStaff && staff.ordersAsStaff.length > 0 ? (
            <div className="space-y-2">
                {staff.ordersAsStaff.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">Đơn #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)} · {order.orderType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadgeVariant[order.status] as 'pending' | 'delivered' | 'cancelled' | 'processing'} className="text-xs">
                      {statusLabels[order.status]}
                    </Badge>
                    <span className="text-sm font-semibold">{formatCurrency(order.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào</p>
          )}
        </CardContent>
      </Card>

      {staff.staffType === 'SHIPPER' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" /> Đánh giá shipper
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReviews ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : reviews && reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {review.customer?.fullName || 'Khách hàng'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Đơn #{review.order_id.slice(0, 8)} · {formatDate(review.created_at)}
                        </p>
                      </div>
                      <StarRating value={review.shipperRating ?? 0} />
                    </div>
                    {review.shipperComment ? (
                      <p className="text-sm text-muted-foreground">
                        &ldquo;{review.shipperComment}&rdquo;
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 italic">Không có bình luận</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có đánh giá nào</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20',
          )}
        />
      ))}
    </div>
  );
}
