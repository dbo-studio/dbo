import { useRouter } from "next/navigation";
import { useEffect } from "react";

const useRedirect = (redirectTo: string, seconds = 1) => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(redirectTo);
    }, seconds * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [router]);
};

export default useRedirect;
