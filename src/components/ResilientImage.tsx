import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { resolveClientImage } from '../lib/clientImages';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ResilientImage({ src, alt, className = 'w-full h-full object-cover' }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveClientImage(src);

  if (failed || !resolvedSrc) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#17422B] to-[#0F2E1E] text-[#D8E5DA] p-6 text-center ${className}`}
      >
        <Leaf className="w-8 h-8 mb-2 text-[#A3E635]" aria-hidden="true" />
        <span className="text-xs font-medium max-w-[24ch] leading-snug">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
