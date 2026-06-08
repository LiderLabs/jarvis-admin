"use client";

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className, showText = true, size = 'md' }: LogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render theme-dependent logo after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const dimensions = {
    sm: { width: 200, height: 200 },
    md: { width: 240, height: 240 },
    lg: { width: 320, height: 320 },
  };

  const displayClasses = {
    sm: 'h-14 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-20 w-auto',
  };

  // Use dark logo as default (avoids flash on dark-mode apps)
 const logoSrc = mounted && resolvedTheme === 'light'
  ? '/assets/Rapid.png'
  : '/assets/Rapid.png';

  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src={logoSrc}
        alt="Javis - Life made simple"
        width={dimensions[size].width}
        height={dimensions[size].height}
        className={cn(displayClasses[size], 'object-contain')}
        quality={100}
        priority
      />
    </div>
  );
};

