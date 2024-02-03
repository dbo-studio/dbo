import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const useRedirect = (redirectTo: string, seconds = 1) => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(redirectTo);
    }, seconds * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [redirectTo, router, seconds]);
};
