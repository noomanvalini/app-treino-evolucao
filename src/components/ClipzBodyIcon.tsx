import React from 'react';
import Image from 'next/image';

interface ClipzBodyIconProps {
  className?: string;
  size?: number;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function ClipzBodyIcon({ 
  className = "w-8 h-8", 
  size = 32,
  width,
  height,
  priority = false,
}: ClipzBodyIconProps) {
  const w = width || size;
  const h = height || size;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <Image
        src="/CLIPZBODY ISOLADO.svg"
        alt="ClipzBody Icon"
        width={w}
        height={h}
        className="h-full w-full object-contain select-none"
        priority={priority}
      />
    </div>
  );
}
