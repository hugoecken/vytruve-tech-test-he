import { cn } from '@/shared/lib/utils';

/** Visual tone available for the official Vytruve brand lockup. */
export type BrandLockupTone = 'on-brand' | 'on-light';

/** Props for the official Vytruve brand lockup. */
interface BrandLockupProps {
  className?: string;
  tone: BrandLockupTone;
}

/**
 * Renders the canonical Vytruve artwork exported from Figma.
 *
 * @param props Brand tone and optional layout class.
 * @returns The official local brand asset for the selected background.
 */
export function BrandLockup({ className, tone }: BrandLockupProps) {
  return (
    <img
      alt="Vytruve"
      className={cn(
        'h-auto object-contain',
        tone === 'on-light' && 'brightness-0',
        className,
      )}
      src={`/brand/vytruve-${tone}.svg`}
    />
  );
}
