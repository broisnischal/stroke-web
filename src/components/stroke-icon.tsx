interface StrokeIconProps {
  className?: string;
  alt?: string;
}

export function StrokeIcon({ className = "size-5", alt = "Stroke" }: StrokeIconProps) {
  return (
    <>
      <img src="/icon.png" alt={alt} className={`${className} block dark:hidden`} />
      <img src="/icon-dark.png" alt={alt} className={`${className} hidden dark:block`} />
    </>
  );
}
