import Link from 'next/link'
import Image from 'next/image'
import { HeroSection as HeroType } from '@/lib/supabase'
import TextMorph from './TextMorph'

export default function HeroSection({ hero }: { hero: HeroType | null }) {
  const headline    = hero?.headline    ?? 'Elevate Your Space'
  const subheadline = hero?.subheadline ?? 'Premium ambient lighting & projection gadgets that transform any room into an experience.'
  const ctaText     = hero?.cta_text    ?? 'Shop Now'
  const ctaLink     = hero?.cta_link    ?? '/products'

  const bgImage       = hero?.bg_image        ?? null
  const bgImageMobile = hero?.bg_image_mobile || bgImage
  const bgVideo       = hero?.bg_video        || null
  const bgVideoMobile = hero?.bg_video_mobile || bgVideo

  // Optional animated headline: admin enters 2+ words/phrases (one per
  // line) in /admin/hero, and they morph one into the next instead of
  // showing a static headline. Falls back to the plain headline otherwise.
  const morphWords = (hero?.headline_morph_words ?? '')
    .split(/\r?\n/)
    .map(w => w.trim())
    .filter(Boolean)

  return (
    <section className="relative w-full aspect-[5/6] sm:aspect-[16/10] lg:aspect-[21/9] max-h-[620px] overflow-hidden rounded-b-[2rem] sm:rounded-b-[3rem] bg-[#070a0f]">
      {/* Desktop media */}
      <div className="hidden sm:block absolute inset-0">
        {bgVideo ? (
          <video
            src={bgVideo}
            poster={bgImage ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : bgImage ? (
          <Image
            src={bgImage}
            alt="Hero background"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : null}
      </div>

      {/* Mobile media */}
      <div className="sm:hidden absolute inset-0">
        {bgVideoMobile ? (
          <video
            src={bgVideoMobile}
            poster={bgImageMobile ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : bgImageMobile ? (
          <Image
            src={bgImageMobile}
            alt="Hero background"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : null}
      </div>

      {/* Subtle darkening for text legibility */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <span className="text-brand-300 text-xs font-semibold tracking-[0.2em] uppercase mb-4">
          New Collection
        </span>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-semibold text-white leading-[1.1] mb-4 max-w-2xl">
          {morphWords.length >= 2 ? <TextMorph words={morphWords} color="#fff" /> : headline}
        </h1>
        <p className="hidden sm:block text-white/70 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
          {subheadline}
        </p>
        <Link
          href={ctaLink}
          className="bg-white text-[#111111] px-8 py-3.5 rounded-full font-semibold text-sm
                     hover:scale-105 active:scale-95 transition-transform duration-200 shadow-xl mt-2 sm:mt-0"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  )
}
