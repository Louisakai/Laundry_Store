'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder, useUpdateOrderStatus, useCompleteDelivery, useWeighOrder, useConfirmPayment } from '@/hooks/useOrders';
import { useAssignStaff, useAutoAssignShipper, useUpdateOrderServices, useUpdateOrderPrice } from '@/hooks/useAdmin';
import { useStaffList } from '@/hooks/useStaff';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatCurrency,
  formatDate,
  statusLabels,
  statusBadgeVariant,
} from '@/lib/utils';
import {
  Package,
  ArrowLeft,
  UserCheck,
  Truck,
  Weight,
  Scale,
  Banknote,
  CreditCard,
  ShoppingBag,
  CheckCircle,
  Save,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { PaymentStatus } from '@/types';

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: order, isLoading, refetch } = useOrder(params.id);
  const { data: staffList } = useStaffList({ staffType: 'SHIPPER' });
  const assignStaff = useAssignStaff();
  const autoAssign = useAutoAssignShipper();
  const updateStatus = useUpdateOrderStatus();
  const socketRef = useSocket(params.id);

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [weighValues, setWeighValues] = useState<Record<string, number>>({});
  const [weighing, setWeighing] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [payosUrl, setPayosUrl] = useState<string | null>(null);
  const [payosQr, setPayosQr] = useState<string | null>(null);
  const completeDelivery = useCompleteDelivery();
  const weighOrder = useWeighOrder();
  const confirmPayment = useConfirmPayment();
  const updateOrderServices = useUpdateOrderServices();
  const updateOrderPrice = useUpdateOrderPrice();
  const [editServiceMode, setEditServiceMode] = useState(false);
  const [editServiceValues, setEditServiceValues] = useState<Record<string, number>>({});
  const [editPriceValue, setEditPriceValue] = useState<number>(0);
  const [editPriceMode, setEditPriceMode] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleStatusChange = () => refetch();
    const handleAssigned = () => refetch();
    socket.on('order-status-changed', handleStatusChange);
    socket.on('order-assigned', handleAssigned);

    return () => {
      socket.off('order-status-changed', handleStatusChange);
      socket.off('order-assigned', handleAssigned);
    };
  }, [socketRef, refetch]);

  useEffect(() => {
    if (order?.paymentStatus === PaymentStatus.SUCCESS && (payosUrl || payosQr)) {
      setPayosUrl(null);
      setPayosQr(null);
    }
  }, [order?.paymentStatus, payosUrl, payosQr]);

  useEffect(() => {
    if (order?.staff?.staffType === 'SHIPPER') {
      setSelectedStaffId(order.staff.id);
    }
  }, [order?.staff?.id, order?.staff?.staffType]);

  const handleAssign = async () => {
    if (!selectedStaffId) return;
    setIsAssigning(true);
    try {
      await assignStaff.mutateAsync({ orderId: params.id, staffId: selectedStaffId });
      toast.success('Đã gán nhân viên thành công');
      refetch();
    } catch {
      toast.error('Không thể gán nhân viên');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAutoAssign = async () => {
    setIsAssigning(true);
    try {
      await autoAssign.mutateAsync(params.id);
      toast.success('Đã tự động gán shipper gần nhất');
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không thể tự động gán shipper');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: params.id, status });
      toast.success('Cập nhật trạng thái thành công');
      refetch();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleCompleteDelivery = async (provider?: string) => {
    try {
      const result = await completeDelivery.mutateAsync({ id: params.id, provider }) as { checkoutUrl?: string; qrCode?: string };
      if (result.checkoutUrl) {
        setPayosUrl(result.checkoutUrl);
        setPayosQr(result.qrCode ?? null);
      } else {
        toast.success('Hoàn tất giao hàng');
      }
      setShowPaymentMethod(false);
      refetch();
    } catch {
      toast.error('Không thể hoàn tất');
    }
  };

  const handleConfirmPayment = async () => {
    try {
      await confirmPayment.mutateAsync(params.id);
      toast.success('Xác nhận thanh toán thành công');
      refetch();
    } catch {
      toast.error('Không thể xác nhận thanh toán');
    }
  };

  const handleSaveServices = async () => {
    try {
      const items = Object.entries(editServiceValues).map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity,
      }));
      await updateOrderServices.mutateAsync({ id: params.id, items });
      toast.success('Đã cập nhật dịch vụ');
      setEditServiceMode(false);
      setEditServiceValues({});
      refetch();
    } catch {
      toast.error('Không thể cập nhật dịch vụ');
    }
  };

  const handleSavePrice = async () => {
    try {
      await updateOrderPrice.mutateAsync({ id: params.id, totalPrice: editPriceValue });
      toast.success('Đã cập nhật giá');
      setEditPriceMode(false);
      refetch();
    } catch {
      toast.error('Không thể cập nhật giá');
    }
  };

  const handleWeigh = async () => {
    setWeighing(true);
    try {
      const items = Object.entries(weighValues).map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity,
      }));
      await weighOrder.mutateAsync({ id: params.id, items });
      toast.success('Cân đồ thành công');
      setWeighValues({});
      refetch();
    } catch {
      toast.error('Không thể cập nhật cân');
    } finally {
      setWeighing(false);
    }
  };

  const needsWeigh = order?.status === 'RECEIVED' && order?.orderItems?.some((i) => !i.quantity);

  const calcPreviewTotal = () => {
    if (!order) return 0;
    return order.orderItems.reduce((sum, item) => {
      const qty = weighValues[item.id] ?? item.quantity ?? 0;
      return sum + qty * item.price;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card className="p-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium">Không tìm thấy đơn hàng</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/orders')}>
          Quay lại
        </Button>
      </Card>
    );
  }

  const getStatusActions = (): Record<string, string[]> => {
    const base: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PICKING_UP', 'RECEIVED', 'CANCELLED'],
      PICKING_UP: ['RECEIVED'],
      RECEIVED: ['PROCESSING'],
      PROCESSING: ['DELIVERING'],
      COMPLETED: ['DELIVERING'],
    };
    if (!order) return base;
    if (order.orderType === 'WALKIN') {
      return {
        PENDING: ['RECEIVED', 'CANCELLED'],
        RECEIVED: ['PROCESSING'],
        PROCESSING: ['COMPLETED'],
        COMPLETED: ['DELIVERED'],
      };
    }
    if (order.orderType === 'DROP_OFF') {
      const dropOff = { ...base };
      delete dropOff.PICKING_UP;
      dropOff.CONFIRMED = ['RECEIVED', 'CANCELLED'];
      return dropOff;
    }
    return base;
  };

  const statusActions = getStatusActions();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Đơn #{params.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
        <Badge variant={statusBadgeVariant[order.status] as 'pending' | 'delivered' | 'cancelled' | 'processing'} className="ml-auto text-sm px-3 py-1">
          {statusLabels[order.status]}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> Thông tin đơn hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Khách hàng</span>
              <span className="font-medium">{order.customer?.fullName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SĐT</span>
              <span>{order.customer?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loại đơn</span>
              <span>{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng tiền</span>
              <span className="font-semibold text-lg">{formatCurrency(order.totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thanh toán</span>
              <span>{order.paymentMethod} - {order.paymentStatus}</span>
            </div>
            {order.staff && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nhân viên</span>
                <span>{order.staff.fullName} ({order.staff.staffType})</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Nhân viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.staff && order.staff.staffType !== 'SHIPPER' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{order.staff.staffType === 'SHIPPER' ? 'Shipper' : 'Thợ giặt'}</span>
                <span className="font-medium">{order.staff.fullName}</span>
              </div>
            )}
            {(!order.staff || order.staff.staffType === 'WASHER') && (
              <>
                {(order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'COMPLETED' || order.status === 'DELIVERING') && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">Gán shipper giao hàng</p>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn shipper" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName} {s.isAvailable ? '' : '(offline)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full gap-2"
                      disabled={!selectedStaffId || isAssigning}
                      onClick={handleAssign}
                    >
                      <UserCheck className="h-4 w-4" />
                      {isAssigning ? 'Đang gán...' : 'Gán shipper'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      disabled={isAssigning}
                      onClick={handleAutoAssign}
                    >
                      <Truck className="h-4 w-4" />
                      {isAssigning ? 'Đang gán...' : 'Tự động gán'}
                    </Button>
                  </>
                )}
              </>
            )}
            {order.staff?.staffType === 'SHIPPER' && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">Shipper đã gán</p>
                <Select value={order.staff.id} disabled>
                  <SelectTrigger>
                    <SelectValue>
                      <span className="font-medium">{order.staff.fullName}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={order.staff.id}>{order.staff.fullName}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" /> Cập nhật trạng thái
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {needsWeigh ? (
              <div className="w-full space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scale className="h-5 w-5" />
                  <span>Cân đồ — nhập số lượng (kg) cho từng dịch vụ</span>
                </div>
                <div className="space-y-3">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.service.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} / {item.service.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-24 text-center"
                          placeholder="0"
                          value={weighValues[item.id] ?? item.quantity ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setWeighValues((prev) => ({
                              ...prev,
                              [item.id]: isNaN(val) ? 0 : val,
                            }));
                          }}
                        />
                        <span className="text-sm text-muted-foreground w-8">{item.service.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between font-bold text-lg">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(calcPreviewTotal())}</span>
                </div>
                <Button
                  className="gap-2 w-full"
                  onClick={handleWeigh}
                  disabled={weighing || Object.keys(weighValues).length === 0}
                >
                  <Scale className="h-4 w-4" />
                  {weighing ? 'Đang cân...' : 'Xác nhận cân'}
                </Button>
              </div>
            ) : (order.status !== 'COMPLETED' && order.status !== 'DELIVERING' ? (
              <>
                {(statusActions[order.status] || []).map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    variant={nextStatus === 'CANCELLED' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleUpdateStatus(nextStatus)}
                    disabled={updateStatus.isPending}
                  >
                    {statusLabels[nextStatus]}
                  </Button>
                ))}
                {(!statusActions[order.status] || statusActions[order.status].length === 0) && (
                  <p className="text-sm text-muted-foreground">Không có thao tác nào khả dụng</p>
                )}
              </>
            ) : null
            )}
          </div>
          {order.status === 'COMPLETED' && order.paymentStatus !== 'SUCCESS' && !needsWeigh && (
            <div className="mt-3">
              <Button
                className="gap-2 w-full"
                size="lg"
                onClick={() => setShowPaymentMethod(true)}
              >
                <Banknote className="h-5 w-5" />
                Thanh toán
              </Button>
            </div>
          )}
          {order.status === 'DELIVERING' && order.paymentStatus !== 'SUCCESS' && !needsWeigh && (user?.role === 'ADMIN' || (user?.role === 'STAFF' && user?.staffType === 'SHIPPER' && user.id === order?.staff_id)) && (
            <div className="mt-3">
              <Button className="gap-2 w-full" size="lg" onClick={() => setShowPaymentMethod(true)}>
                <Banknote className="h-5 w-5" />
                Thanh toán
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Weight className="h-5 w-5" /> Dịch vụ
            {!editServiceMode && user?.role === 'ADMIN' && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
                setEditServiceMode(true);
                const vals: Record<string, number> = {};
                order.orderItems.forEach((i) => { vals[i.id] = i.quantity ?? 0; });
                setEditServiceValues(vals);
                setEditPriceValue(order.totalPrice);
              }}>
                <Pencil className="h-4 w-4 mr-1" /> Sửa
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.orderItems?.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-1">
                <div>
                  <p className="font-medium">{item.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {editServiceMode ? (
                      <span className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-20 h-8 text-center inline-block"
                          value={editServiceValues[item.id] ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setEditServiceValues((prev) => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }));
                          }}
                        />
                        <span>{item.service.unit} x {formatCurrency(item.price)}</span>
                      </span>
                    ) : (
                      item.quantity ? `${item.quantity} ${item.service.unit} x ${formatCurrency(item.price)}` : 'Chưa cân'
                    )}
                  </p>
                </div>
                <p className="font-semibold">
                  {editServiceMode
                    ? formatCurrency((editServiceValues[item.id] ?? 0) * item.price)
                    : (item.subtotal ? formatCurrency(item.subtotal) : '—')
                  }
                </p>
              </div>
            ))}
          </div>
          {editServiceMode && (
            <div className="mt-4 space-y-3">
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Điều chỉnh giá</span>
                <div className="flex items-center gap-2">
                  {editPriceMode ? (
                    <>
                      <Input
                        type="number"
                        min={0}
                        className="w-28 h-8 text-right"
                        value={editPriceValue}
                        onChange={(e) => setEditPriceValue(parseFloat(e.target.value) || 0)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => setEditPriceMode(false)}>Huỷ</Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditPriceMode(true)}>
                      <Pencil className="h-3 w-3 mr-1" /> Sửa
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng</span>
                <span>{formatCurrency(editPriceValue)}</span>
              </div>
              <Button className="w-full gap-2" onClick={handleSaveServices}>
                <Save className="h-4 w-4" /> Lưu thay đổi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showPaymentMethod && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-lg text-center">Chọn phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-lg font-bold pb-3 border-b">
                <span>Tổng tiền</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
              <Button
                className="w-full gap-3 justify-start h-14"
                variant="outline"
                onClick={() => handleCompleteDelivery('CASH')}
                disabled={completeDelivery.isPending}
              >
                <Banknote className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-medium">Tiền mặt</p>
                  <p className="text-xs text-muted-foreground">Nhận tiền mặt tại cửa hàng</p>
                </div>
              </Button>
              <Button
                className="w-full gap-3 justify-start h-14"
                variant="outline"
                onClick={() => handleCompleteDelivery('PAYOS')}
                disabled={completeDelivery.isPending}
              >
                <CreditCard className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-medium">Chuyển khoản</p>
                  <p className="text-xs text-muted-foreground">Quét mã QR để thanh toán</p>
                </div>
              </Button>
            </CardContent>
            <div className="px-6 pb-6">
              <Button variant="ghost" className="w-full" onClick={() => setShowPaymentMethod(false)}>
                Hủy
              </Button>
            </div>
          </Card>
        </div>
      )}
      {payosUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Thanh toán chuyển khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Quét mã QR để thanh toán</p>
              <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payosQr ?? payosUrl ?? '')}`}
                  alt="QR thanh toán"
                  className="mx-auto"
                  width={250}
                  height={250}
                />
              </div>
              <p className="text-xs text-muted-foreground break-all">{payosUrl}</p>
            </CardContent>
            <div className="space-y-2 px-6 pb-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setPayosUrl(null); setPayosQr(null); }}
              >
                Đóng
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { window.open(payosUrl, '_blank'); }}
              >
                Mở trang thanh toán
              </Button>
              <Button
                className="w-full gap-2"
                onClick={async () => {
                  await handleConfirmPayment();
                  setPayosUrl(null);
                  setPayosQr(null);
                }}
                disabled={confirmPayment.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Đã nhận được chuyển khoản
              </Button>
            </div>
          </Card>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.trackingLogs?.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{statusLabels[log.status]}</p>
                  {log.note && <p className="text-sm text-muted-foreground">{log.note}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
