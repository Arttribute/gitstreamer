import { HTMLAttributes, forwardRef, useState } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  default: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = "", src, alt, fallback, size = "default", ...props }, ref) => {
    const [imageError, setImageError] = useState(false);

    const initials = fallback
      ? fallback
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

    return (
      <div
        ref={ref}
        className={`relative flex shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-medium text-zinc-600 dark:text-zinc-300">
            {initials}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";
