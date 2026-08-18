import React from 'react';

interface DrillcoLogoProps {
  className?: string;
  variant?: 'red' | 'white';
  size?: 'sm' | 'md' | 'lg';
  showStar?: boolean;
}

export function DrillcoLogo({ className = '', variant = 'red', size = 'md', showStar = false }: DrillcoLogoProps) {
  const isWhite = variant === 'white';
  const textColor = isWhite ? 'text-white' : 'text-[#9E1B2C]';
  const sparkColor = isWhite ? '#FFFFFF' : '#9E1B2C';

  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-3xl';

  return (
    <div className={`flex items-center space-x-1 font-black tracking-tighter ${textSize} ${textColor} ${className}`}>
      <span>DRILLCO</span>
      <sup className="text-xs font-semibold">®</sup>
      {showStar && (
        <svg
          width={size === 'sm' ? '22' : size === 'lg' ? '36' : '28'}
          height={size === 'sm' ? '22' : size === 'lg' ? '36' : '28'}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="inline-block flex-shrink-0 ml-1"
        >
          <path
            d="M20 2L22.5 15.5L36 12L25 21L36 30L22.5 26.5L20 40L17.5 26.5L4 30L15 21L4 12L17.5 15.5L20 2Z"
            fill={sparkColor}
          />
        </svg>
      )}
    </div>
  );
}
