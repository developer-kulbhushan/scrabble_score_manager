import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
