import { type ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer';

/** Props for a read-only detail overlay shared by collection rows. */
interface ResponsiveDetailsOverlayProps {
  children: ReactNode;
  closeLabel: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

/** Props for one semantic label and value within a detail list. */
interface DetailItemProps {
  children: ReactNode;
  label: string;
}

/**
 * Displays read-only row details in a desktop Dialog or compact bottom Drawer.
 *
 * @param props Controlled visibility, localized heading and detail content.
 * @returns An accessible responsive overlay matching the form workflows.
 */
export function ResponsiveDetailsOverlay({
  children,
  closeLabel,
  description,
  onOpenChange,
  open,
  title,
}: ResponsiveDetailsOverlayProps) {
  const isMobile = useIsMobile();
  const footer = (
    <Button
      onClick={() => onOpenChange(false)}
      size="lg"
      type="button"
      variant="outline"
    >
      {closeLabel}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
          <DrawerFooter className="flex-row justify-end gap-3">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent showCloseButton={false}>
        <DialogClose
          render={
            <Button
              aria-label={closeLabel}
              className="absolute top-2 right-2"
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <XIcon aria-hidden="true" />
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Groups read-only metadata as a semantic definition list. */
export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col gap-2">{children}</dl>;
}

/**
 * Presents one localized metadata label and its safe display value.
 *
 * @param props Localized label and already-authorized display content.
 * @returns One responsive row in the enclosing definition list.
 */
export function DetailItem({ children, label }: DetailItemProps) {
  return (
    <div className="grid gap-1 rounded-lg bg-muted/50 p-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm sm:text-right">{children}</dd>
    </div>
  );
}
