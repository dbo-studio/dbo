import Layout from '@/components/layout/Layout.tsx';
import { useSetupDesktop } from '@/hooks';

export default function BaseLayout() {
  const done = useSetupDesktop();
  return done ? <Layout /> : null;
}
