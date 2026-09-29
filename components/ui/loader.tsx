type LoaderProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
}

// Each size includes its own responsive breakpoints, so the same prop
// looks right on both phone and desktop — no need to pick a different
// size manually per device.
const SIZE_CONFIG = {
  sm: {
    container: 'w-16 h-16 sm:w-20 sm:h-20',
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
    maxWidth: 'max-w-[12rem]',
  },
  md: {
    container: 'w-24 h-24 sm:w-32 sm:h-32',
    title: 'text-base font-medium',
    subtitle: 'text-sm',
    maxWidth: 'max-w-[14rem]',
  },
  lg: {
    container: 'w-32 h-32 sm:w-40 sm:h-40',
    title: 'text-lg font-semibold',
    subtitle: 'text-base',
    maxWidth: 'max-w-[16rem]',
  },
} as const

export default function Loader({
  title = 'Just a moment...',
  subtitle = 'Please wait while we get things ready',
  size = 'md',
  className = '',
  ...props
}: LoaderProps) {
  const cfg = SIZE_CONFIG[size]

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 sm:gap-8 p-6 sm:p-8 ${className}`}
      {...props}
    >
      <div className={`loader-container relative ${cfg.container}`}>
        <div className="loader-ring-1 absolute inset-0 rounded-full" />
        <div className="loader-ring-2 absolute inset-0 rounded-full" />
        <div className="loader-ring-3 absolute inset-0 rounded-full" />
        <div className="loader-ring-4 absolute inset-0 rounded-full" />
      </div>

      <div className={`loader-text-wrap text-center space-y-2 sm:space-y-3 ${cfg.maxWidth}`}>
        <h1 className={`loader-title-wrap ${cfg.title} text-ink-primary/90 leading-tight tracking-tight`}>
          <span className="loader-title-text">{title}</span>
        </h1>
        <p className={`loader-subtitle-wrap ${cfg.subtitle} text-ink-secondary leading-relaxed`}>
          <span className="loader-subtitle-text">{subtitle}</span>
        </p>
      </div>
    </div>
  )
}
