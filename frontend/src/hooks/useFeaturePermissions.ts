import { canExport, canImport, canUseAi, canUseCli } from '@/core/auth/permissions';
import { useAuthStore } from '@/store/authStore/auth.store';

export type FeaturePermissions = { cli: boolean; import: boolean; export: boolean; ai: boolean };

/** What the signed-in user may use. The server enforces the same flags; this only hides what would be refused. */
export function useFeaturePermissions(): FeaturePermissions {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);

  return {
    cli: canUseCli(mode, user),
    import: canImport(mode, user),
    export: canExport(mode, user),
    ai: canUseAi(mode, user)
  };
}
