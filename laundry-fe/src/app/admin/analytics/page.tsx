'use client';

import { useAdminRevenue, useAdminOrderAnalytics, useStaffAnalytics, useServiceAnalytics, useServiceReviews, useDailyRevenue } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { statusLabels, orderTypeLabels } from '@/lib/utils';
import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Star,
} from 'lucide-react';

const orderTypeShortLabels: Record<string, string> = {
  ONLINE: 'Online - Giao nhà',
  WALKIN: 'Tự mang đến',
  DROP_OFF: 'Tiệm - Giao nhà',
};

export default function AdminAnalyticsPage() {
  const { data: revenue, isLoading: loadingRevenue } = useAdminRevenue();
  const { data: orderAnalytics, isLoading: loadingOrders } = useAdminOrderAnalytics();
  const { data: staffAnalytics, isLoading: loadingStaff } = useStaffAnalytics();
  const { data: serviceAnalytics, isLoading: loadingServices } = useServiceAnalytics();
  const { data: serviceReviews, isLoading: loadingReviews } = useServiceReviews();
  const [revenueMode, setRevenueMode] = useState<'month' | 'quarter' | 'year'>('month');
  const [revenueMonth, setRevenueMonth] = useState(new Date().getMonth() + 1);
  const [revenueYear, setRevenueYear] = useState(new Date().getFullYear());
  const now = new Date();
  const revenueParams = (() => {
    if (revenueMode === 'month') {
      const from = new Date(revenueYear, revenueMonth - 1, 1);
      const to = new Date(revenueYear, revenueMonth, 0, 23, 59, 59);
      return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) };
    }
    if (revenueMode === 'quarter') {
      const from = new Date(revenueYear, 0, 1);
      const to = new Date(revenueYear, 11, 31, 23, 59, 59);
      return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) };
    }
    const from = new Date(now.getFullYear() - 2, 0, 1);
    const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) };
  })();
  const { data: dailyRevenue, isLoading: loadingDailyRevenue } = useDailyRevenue(revenueParams);

  const revenueChartData = (() => {
    if (!dailyRevenue) return null;
    if (revenueMode === 'month') return null;

    if (revenueMode === 'quarter') {
      const qLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarters = qLabels.map((_, qi) => {
        const revenue = dailyRevenue
          .filter((d) => {
            const m = new Date(d.date).getMonth();
            return m >= qi * 3 && m < (qi + 1) * 3;
          })
          .reduce((sum, d) => sum + d.revenue, 0);
        return { name: qLabels[qi], revenue };
      });
      return quarters;
    }

    const yLabels = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];
    const years = yLabels.map((y) => {
      const revenue = dailyRevenue
        .filter((d) => new Date(d.date).getFullYear() === y)
        .reduce((sum, d) => sum + d.revenue, 0);
      return { name: `${y}`, revenue };
    });
    return years;
  })();
  const [reviewFilter, setReviewFilter] = useState<number | null>(null);
  const [servicePage, setServicePage] = useState(0);

  const filteredReviews = serviceReviews?.filter(
    (r) => reviewFilter === null || r.serviceRating === reviewFilter,
  ) ?? [];

  const maxRevenue = dailyRevenue ? Math.max(...dailyRevenue.map(d => d.revenue), 0) : 0;
  const allTicks = [0, 500000, 1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000];
  const revenueTicks = Array.from(new Set([...allTicks.filter(t => t <= maxRevenue), maxRevenue]));

  const activeServices = serviceAnalytics?.filter(s => s.orderCount > 0) ?? [];
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(activeServices.length / perPage));
  const pagedServices = activeServices.slice(servicePage * perPage, (servicePage + 1) * perPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Phân tích</h1>
        <p className="text-muted-foreground mt-1">Thống kê doanh thu và hiệu suất</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng doanh thu
            </CardTitle>
            <div className="p-2 rounded-full bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-3xl font-bold">
                  {formatCurrency(revenue?.totalRevenue || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {revenue?.orderCount || 0} đơn · Trung bình{' '}
                  {formatCurrency(revenue?.averageOrderValue || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đơn đã giao
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-100">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{orderAnalytics?.completedOrders || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nhân viên
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStaff ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{staffAnalytics?.length || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Doanh thu
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="flex gap-1">
              {[
                { key: 'month', label: 'Tháng' },
                { key: 'quarter', label: 'Quý' },
                { key: 'year', label: 'Năm' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRevenueMode(r.key as typeof revenueMode)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    revenueMode === r.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:border-primary'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">·</span>
            {revenueMode === 'month' && (
              <div className="flex gap-1">
                <select
                  value={revenueMonth}
                  onChange={(e) => setRevenueMonth(Number(e.target.value))}
                  className="h-7 text-xs rounded border border-input bg-background px-2"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                  ))}
                </select>
                <select
                  value={revenueYear}
                  onChange={(e) => setRevenueYear(Number(e.target.value))}
                  className="h-7 text-xs rounded border border-input bg-background px-2"
                >
                  {[now.getFullYear() - 3, now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
            {revenueMode === 'quarter' && (
              <select
                value={revenueYear}
                onChange={(e) => setRevenueYear(Number(e.target.value))}
                className="h-7 text-xs rounded border border-input bg-background px-2"
              >
                {[now.getFullYear() - 3, now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingDailyRevenue ? (
            <Skeleton className="h-64" />
          ) : revenueMode === 'month' && dailyRevenue && dailyRevenue.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    ticks={revenueTicks}
                    tickFormatter={(v: any) => {
                      const n = Number(v);
                      if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
                      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                      return `${n}`;
                    }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')}₫`, 'Doanh thu']}
                    labelFormatter={(label: any) => {
                      const d = new Date(label);
                      return d.toLocaleDateString('vi-VN');
                    }}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : revenueChartData && revenueChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} className="text-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: any) => {
                      const n = Number(v);
                      if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
                      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                      return `${n}`;
                    }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')}₫`, 'Doanh thu']}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu doanh thu</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Đơn hàng theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <Skeleton className="h-40" />
            ) : orderAnalytics && orderAnalytics.byStatus.length > 0 ? (
              <div className="space-y-3">
                {orderAnalytics.byStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between gap-3">
                    <span
                      className="text-sm w-32 shrink-0 truncate"
                      title={statusLabels[item.status] || item.status}
                    >
                      {statusLabels[item.status] || item.status}
                    </span>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(item.count / Math.max(...orderAnalytics.byStatus.map((s) => s.count))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right shrink-0">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Đơn hàng theo loại
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <Skeleton className="h-40" />
            ) : orderAnalytics && orderAnalytics.byOrderType.length > 0 ? (
              <div className="space-y-3">
                {orderAnalytics.byOrderType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between gap-3">
                    <span
                      className="text-sm w-32 shrink-0 truncate"
                      title={orderTypeLabels[item.type] || item.type}
                    >
                      {orderTypeShortLabels[item.type] || item.type}
                    </span>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(item.count / Math.max(...orderAnalytics.byOrderType.map((t) => t.count))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right shrink-0">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> Dịch vụ được sử dụng nhiều
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[340px]">
            {loadingServices ? (
              <Skeleton className="flex-1" />
            ) : activeServices.length > 0 ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {pagedServices.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">
                          {servicePage * perPage + i + 1}.
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.totalQuantity.toFixed(1)} {s.unit} · {s.orderCount} đơn
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium shrink-0 ml-3">
                        {formatCurrency(s.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t mt-4">
                    <button
                      onClick={() => setServicePage(p => Math.max(0, p - 1))}
                      disabled={servicePage === 0}
                      className="px-2.5 py-1 text-xs rounded border border-input text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      ‹ Trước
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setServicePage(i)}
                        className={`w-7 h-7 text-xs rounded border transition-colors ${
                          servicePage === i
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-input text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setServicePage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={servicePage === totalPages - 1}
                      className="px-2.5 py-1 text-xs rounded border border-input text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Sau ›
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu dịch vụ</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" /> Đánh giá dịch vụ gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[340px]">
            <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
              <button
                onClick={() => setReviewFilter(null)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  reviewFilter === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:border-primary'
                }`}
              >
                Tất cả
              </button>
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewFilter(reviewFilter === star ? null : star)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    reviewFilter === star
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-background text-muted-foreground border-input hover:border-yellow-500'
                  }`}
                >
                  {star} ★
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingReviews ? (
                <Skeleton className="h-full" />
              ) : filteredReviews.length > 0 ? (
                <div className="space-y-4">
                  {filteredReviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{r.customer.fullName}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`text-xs ${i < r.serviceRating ? 'text-yellow-500' : 'text-muted-foreground'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      {r.serviceComment && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{r.serviceComment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    {reviewFilter !== null ? `Không có đánh giá ${reviewFilter} ★` : 'Chưa có đánh giá nào'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Hiệu suất nhân viên giao hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStaff ? (
            <Skeleton className="h-48" />
          ) : staffAnalytics && staffAnalytics.filter(s => s.staffType === 'SHIPPER').length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Nhân viên</th>
                    <th className="text-right py-2 pr-4">Đơn hoàn thành</th>
                    <th className="text-right py-2 pr-4">Doanh thu</th>
                    <th className="text-right py-2">Đánh giá TB</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAnalytics.filter(s => s.staffType === 'SHIPPER').map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{s.fullName}</td>
                      <td className="py-3 pr-4 text-right">{s.completedOrders}</td>
                      <td className="py-3 pr-4 text-right font-medium">
                        {formatCurrency(s.totalRevenue)}
                      </td>
                      <td className="py-3 text-right">
                        {s.avgShipperRating ? `${s.avgShipperRating.toFixed(1)} ⭐` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu nhân viên giao hàng</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
