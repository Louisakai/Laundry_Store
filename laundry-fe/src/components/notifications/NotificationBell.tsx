'use client';

import { useRouter } from 'next/navigation';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export function NotificationBell() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const handleClick = (notification: { id: string; relatedId: string | null }) => {
    markAsRead.mutate(notification.id);
    if (notification.relatedId) {
      router.push(`/orders/${notification.relatedId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-9 w-9 rounded-full hover:bg-accent inline-flex items-center justify-center">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold">Thông báo</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3 w-3" />
              Đọc tất cả
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                'flex flex-col items-start gap-0.5 py-3 px-3 cursor-pointer',
                !n.isRead && 'bg-primary/5',
              )}
              onClick={() => handleClick(n)}
            >
              <div className="flex items-center gap-2 w-full">
                {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                <p className={cn('text-sm', !n.isRead ? 'font-medium' : '')}>{n.title}</p>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 ml-4">{n.content}</p>
              <p className="text-[10px] text-muted-foreground ml-4">{formatDate(n.created_at)}</p>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Không có thông báo
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
