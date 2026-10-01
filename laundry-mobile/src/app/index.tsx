import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (!accessToken) return <Redirect href="/login" />;
  if (user?.role === 'STAFF') return <Redirect href="/(staff)" />;
  if (user?.role === 'CUSTOMER') return <Redirect href="/(customer)" />;
  return <Redirect href="/login" />;
}
