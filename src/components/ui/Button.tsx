import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      primary: 'bg-neon-blue text-white hover:bg-neon-blue-light hover:glow-sm hover:scale-105 motion-reduce:hover:scale-100 motion-reduce:hover:shadow-none',
      secondary: 'bg-neon-cyan text-white hover:bg-neon-cyan/90 hover:glow-sm hover:scale-105 motion-reduce:hover:scale-100 motion-reduce:hover:shadow-none',
      ghost: 'hover:bg-muted hover:text-foreground',
      outline: 'border border-neon-blue bg-transparent text-neon-blue-light hover:bg-neon-blue/10 hover:border-neon-blue-light hover:scale-105 motion-reduce:hover:scale-100',
    };

    const sizeStyles = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    };

    const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    return <button ref={ref} className={classes} {...props} />;
  }
);

Button.displayName = 'Button';
