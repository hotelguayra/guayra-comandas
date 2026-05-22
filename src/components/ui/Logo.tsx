import { clsx } from 'clsx'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'dark' | 'light' | 'default'
}

export function Logo({ className, size = 'md', showText = true, variant = 'default' }: LogoProps) {
  const sizes = { sm: 'h-8 w-auto', md: 'h-12 w-auto', lg: 'h-16 w-auto', xl: 'h-24 w-auto' }
  const textSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' }

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <img
        src={variant === 'light' ? '/logoC.png' : variant === 'dark' ? '/logoO.png' : '/logoG.png'}
        alt="Guayrá"
        className={clsx(sizes[size], 'object-contain')}
      />
      {showText && (
        <div>
          <h1 className={clsx('font-heading leading-none', textSizes[size], variant === 'light' ? 'text-windsor' : 'text-tierra-light')}>
            Guayrá
          </h1>
          <p className={clsx('text-xs tracking-widest uppercase', variant === 'light' ? 'text-tierra-dark' : 'text-tierra-muted')}>
            Comandas
          </p>
        </div>
      )}
    </div>
  )
}
