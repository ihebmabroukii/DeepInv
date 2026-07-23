import React from 'react';

interface AttijariLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function AttijariLogo({ className, ...props }: AttijariLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Top Yellow Region */}
      <polygon
        points="0,0 100,0 100,40 80,60 60,40 40,60 20,40 0,60"
        fill="#FFC107"
      />
      {/* Bottom Orange Region */}
      <polygon
        points="0,60 20,40 40,60 60,40 80,60 100,40 100,100 0,100"
        fill="#FF5722"
      />
      {/* Black dividing line forming 'AW' */}
      <polyline
        points="0,60 20,40 40,60 60,40 80,60 100,40"
        stroke="#111111"
        strokeWidth="6"
        fill="none"
        strokeLinejoin="miter"
        strokeMiterlimit="4"
      />
      {/* Square dot forming the 'A' crossbar */}
      <rect x="17" y="49" width="6" height="6" fill="#111111" />
    </svg>
  );
}
