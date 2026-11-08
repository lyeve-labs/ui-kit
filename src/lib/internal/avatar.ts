/** The avatar size ladder, which Avatar and AvatarGroup's overflow chip both draw on. */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const AVATAR_SIZE: Record<AvatarSize, { wrap: string; text: string }> = {
  xs: { wrap: 'w-6 h-6', text: 'text-[9px]' },
  sm: { wrap: 'w-7 h-7', text: 'text-[10px]' },
  md: { wrap: 'w-8 h-8', text: 'text-xs' },
  lg: { wrap: 'w-10 h-10', text: 'text-sm' },
  xl: { wrap: 'w-14 h-14', text: 'text-base' },
};
