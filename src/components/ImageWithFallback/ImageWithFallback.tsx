import { useCallback, useState } from "react";
import type { ImgHTMLAttributes, ReactEventHandler, ReactNode } from "react";

const DEFAULT_FALLBACK_LABEL = "Image not available";
const FALLBACK_CLASS_NAME =
  "image-fallback box-border inline-flex min-h-8 min-w-8 flex-col items-center justify-center gap-1 overflow-hidden rounded border border-dashed border-[#c9c9c9] bg-[#f1f1f1] p-2 text-[#6b6b6b]";

type NativeImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "children" | "className" | "onError" | "src"
>;

export interface ImageWithFallbackProps extends NativeImageProps {
  src?: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  fallbackClassName?: string;
  fallbackContent?: ReactNode;
  fallbackLabel?: string;
  onError?: ReactEventHandler<HTMLImageElement>;
}

interface ImageFallbackPlaceholderProps {
  alt: string;
  className: string;
  fallbackClassName?: string;
  fallbackContent?: ReactNode;
  fallbackLabel?: string;
}

const buildFallbackClassName = (
  className: string,
  fallbackClassName?: string
): string =>
  [FALLBACK_CLASS_NAME, className, fallbackClassName].filter(Boolean).join(" ");

function ImageFallbackPlaceholder({
  alt,
  className,
  fallbackClassName,
  fallbackContent,
  fallbackLabel,
}: ImageFallbackPlaceholderProps) {
  const accessibleLabel = alt || fallbackLabel || DEFAULT_FALLBACK_LABEL;

  return (
    <div
      className={buildFallbackClassName(className, fallbackClassName)}
      role="img"
      aria-label={accessibleLabel}
    >
      {fallbackContent ?? (
        <>
          <svg
            className="image-fallback-icon h-auto min-w-4 max-w-12 fill-current opacity-70 w-1/2"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
          {fallbackLabel && (
            <span className="image-fallback-label max-w-full truncate text-center text-xs">
              {fallbackLabel}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function ImageWithFallback({
  src,
  alt = "",
  className = "",
  fallbackSrc,
  fallbackClassName,
  fallbackContent,
  fallbackLabel,
  onError,
  ...imageProps
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string>();

  const handleImageError: ReactEventHandler<HTMLImageElement> = useCallback(
    (event) => {
      if (src) {
        setFailedSrc(src);
      }
      onError?.(event);
    },
    [onError, src]
  );

  const showPlaceholder = !src || failedSrc === src;

  if (showPlaceholder && fallbackSrc) {
    return (
      <img
        {...imageProps}
        src={fallbackSrc}
        alt={alt}
        className={className}
        onError={onError}
      />
    );
  }

  if (showPlaceholder) {
    return (
      <ImageFallbackPlaceholder
        alt={alt}
        className={className}
        fallbackClassName={fallbackClassName}
        fallbackContent={fallbackContent}
        fallbackLabel={fallbackLabel}
      />
    );
  }

  return (
    <img
      {...imageProps}
      src={src}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  );
}

export default ImageWithFallback;
