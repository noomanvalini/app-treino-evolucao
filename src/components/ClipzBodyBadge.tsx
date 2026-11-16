import React from 'react';
import Image from 'next/image';

interface ClipzBodyBadgeProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function ClipzBodyBadge({
  className = 'h-7 w-auto object-contain',
  width = 140,
  height = 32,
  priority = false,
}: ClipzBodyBadgeProps) {
  return (
    <div className={`relative flex items-center shrink-0 ${className}`}>
      <Image
        src="/LOGO CLIPZBODY BADGET.svg"
        alt="ClipzBody"
        width={width}
        height={height}
        className="h-full w-auto object-contain select-none"
        priority={priority}
      />
    </div>
  );
}
