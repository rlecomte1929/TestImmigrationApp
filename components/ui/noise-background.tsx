'use client';

import { useEffect, useRef } from 'react';

interface NoiseBackgroundProps {
  opacity?: number;
  grainSize?: number;
  gradientColor?: string;
  children: React.ReactNode;
  className?: string;
}

export default function NoiseBackground({
  opacity = 0.01,
  grainSize = 2,
  gradientColor = 'slate',
  children,
  className = '',
}: NoiseBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    const generateNoise = () => {
      updateCanvasSize();
      
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255;
        data[i] = noise;     // Red
        data[i + 1] = noise; // Green
        data[i + 2] = noise; // Blue
        data[i + 3] = opacity * 255; // Alpha
      }

      ctx.putImageData(imageData, 0, 0);
    };

    generateNoise();

    const resizeObserver = new ResizeObserver(generateNoise);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [opacity, grainSize]);

  const gradientClasses = {
    slate: 'bg-gradient-to-br from-slate-50 via-white to-slate-100',
    blue: 'bg-gradient-to-br from-blue-50 via-white to-blue-100',
    purple: 'bg-gradient-to-br from-purple-50 via-white to-purple-100',
    gray: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    indigo: 'bg-gradient-to-br from-indigo-50 via-white to-indigo-100',
  };

  return (
    <div className={`relative ${gradientClasses[gradientColor as keyof typeof gradientClasses] || gradientClasses.slate} ${className}`}>
      {/* Gradient overlay with geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large circle gradient */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-radial from-slate-200/20 via-slate-100/10 to-transparent rounded-full blur-3xl" />
        
        {/* Medium circle on the left */}
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-radial from-blue-200/15 via-blue-100/8 to-transparent rounded-full blur-2xl" />
        
        {/* Small accent circle */}
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-radial from-purple-200/12 via-purple-100/6 to-transparent rounded-full blur-xl" />
        
        {/* Streak/arc effect */}
        <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-gradient-to-r from-transparent via-slate-200/20 to-transparent transform -skew-y-12 blur-xl" />
      </div>

      {/* Noise texture overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-multiply"
        style={{ opacity }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}