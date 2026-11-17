import React from 'react';
import Image from 'next/image';

interface ClipzBodyBadgeProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function ClipzBodyBadge({
  className = 'h-7 w-auto',
  width = 110,
  height = 34,
  priority = false,
}: ClipzBodyBadgeProps) {
  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
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
