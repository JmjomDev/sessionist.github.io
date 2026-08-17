import React from 'react';
import whiteFullLogoPath from '../assets/new/whitefull.png';
import logoOutlinePath from '../assets/logo-outline.png';
import logoBetaPath from '../assets/logo.png';
import newLogoSmallPath from '../assets/new/small logo.png';
import newLogoBigPath from '../assets/new/big logo.png';
import newLogoOutlinePath from '../assets/new/outlines.png';

export { whiteFullLogoPath, logoOutlinePath, logoBetaPath, newLogoSmallPath, newLogoBigPath, newLogoOutlinePath };

interface AppLogoIconProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  useNewOutline?: boolean;
}

// Full White Logo Icon Component — uses the exact whitefull.png logo asset with glowing accent drop-shadow
export const AppLogoIcon: React.FC<AppLogoIconProps> = ({
  className = 'w-6 h-6',
  style,
  color,
  useNewOutline = false,
}) => {
  const logoSrc = useNewOutline ? newLogoOutlinePath : whiteFullLogoPath;

  if (color && color !== 'currentColor') {
    return (
      <div
        className={`inline-block shrink-0 select-none pointer-events-none ${className}`}
        style={{
          backgroundColor: color,
          WebkitMaskImage: `url("${logoSrc}")`,
          maskImage: `url("${logoSrc}")`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          filter: `drop-shadow(0 0 10px ${color}88)`,
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt="Sessionist S Logo"
      className={`inline-block shrink-0 select-none pointer-events-none object-contain ${className}`}
      style={style}
    />
  );
};

// Main S logo component — uses high-res new logo asset
export const AppBetaLogo: React.FC<AppLogoIconProps> = ({ className = 'w-8 h-8', style }) => {
  return (
    <img
      src={newLogoBigPath || logoBetaPath}
      alt="Sessionist S Logo"
      className={`object-contain pointer-events-none select-none rounded-xl ${className}`}
      style={style}
    />
  );
};
