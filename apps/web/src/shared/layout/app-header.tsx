import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LanguagesIcon, LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearAccountState } from '@/modules/auth/api/session-cache';
import { useDeleteSession } from '@/shared/api/generated/client/authentication/authentication';
import { BrandLockup } from '@/shared/brand/brand-lockup';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Spinner } from '@/shared/ui/spinner';

/**
 * Renders the canonical responsive header and account menu.
 *
 * @returns The brand, language controls and sign-out action.
 */
export function AppHeader(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const mutation = useDeleteSession();
  const language = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en';

  /** Ends the cookie session while keeping a recoverable menu failure visible. */
  const signOut = async (): Promise<void> => {
    setSignOutFailed(false);
    try {
      await mutation.mutateAsync();
      clearAccountState(queryClient);
      setOpen(false);
      await navigate({
        replace: true,
        search: { redirect: '/patients' },
        to: '/sign-in',
      });
    } catch {
      setSignOutFailed(true);
    }
  };

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-20 w-full max-w-[1248px] items-center justify-between px-4 sm:px-6">
        <BrandLockup className="w-42" tone="on-light" />

        <DropdownMenu onOpenChange={setOpen} open={open}>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={t('shell.profile.open')}
                className="size-12 rounded-full p-0"
                variant="ghost"
              />
            }
          >
            <Avatar className="size-12">
              <AvatarFallback>V</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t('shell.profile.account')}
              </DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LanguagesIcon aria-hidden="true" data-icon="inline-start" />
                  {t('shell.profile.language')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    onValueChange={(value) => void i18n.changeLanguage(value)}
                    value={language}
                  >
                    <DropdownMenuRadioItem value="en">
                      {t('common.languages.en')}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="fr">
                      {t('common.languages.fr')}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={mutation.isPending}
                onClick={() => void signOut()}
                variant="destructive"
              >
                {mutation.isPending ? (
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                ) : (
                  <LogOutIcon aria-hidden="true" data-icon="inline-start" />
                )}
                {t('shell.profile.signOut')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {signOutFailed && (
              <p
                aria-live="polite"
                className="px-1.5 py-1 text-xs text-destructive"
                role="alert"
              >
                {t('shell.profile.signOutFailed')}
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
