import { useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_FALLBACK = "/placeholder.svg";

/**
 * An <img> that can never show a broken image:
 * - if the primary src fails to load (404, offline CDN, expired host), the
 *   element swaps to a tasteful local fallback (default "/placeholder.svg")
 * - if even the fallback fails, the element hides itself entirely
 * - when the primary src prop changes (e.g. async data arrives), the state
 *   resets so the new source gets a fresh attempt
 */
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Local fallback source used when the primary src fails. */
  fallback?: string;
}

export function SafeImage({
  fallback = DEFAULT_FALLBACK,
  onError,
  className,
  ...props
}: SafeImageProps) {
  const [lastSrc, setLastSrc] = useState(props.src);
  const [failed, setFailed] = useState(false);

  // Derived-state reset pattern: re-attempt when the source changes.
  if (props.src !== lastSrc) {
    setLastSrc(props.src);
    setFailed(false);
  }

  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      src={failed ? fallback : props.src}
      className={cn(className, failed && "object-contain")}
      onError={(event) => {
        if (!failed) {
          setFailed(true);
        } else {
          event.currentTarget.style.visibility = "hidden";
        }
        onError?.(event);
      }}
    />
  );
}
