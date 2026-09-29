import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Returns & Refunds — Elyvate',
  description: '30-day hassle-free returns on all Elyvate products. Learn how to request a return or refund.',
}

export default function ReturnsPolicy() {
  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-ink-primary mb-2">Returns & Refunds</h1>
        <p className="text-ink-muted text-sm mb-10">Last updated: June 2026</p>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">30-Day Return Policy</h2>
          <p className="text-ink-secondary leading-relaxed">We want you to love your purchase. If you're not completely satisfied, you may return your item within <strong>30 days</strong> of delivery for a full refund.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Eligibility</h2>
          <ul className="space-y-2 text-ink-secondary">
            {[
              'Item must be in original, unused condition',
              'Item must be in original packaging',
              'You must provide your order ID and proof of purchase',
              'Return request must be submitted within 30 days of delivery',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Damaged or Wrong Item</h2>
          <p className="text-ink-secondary leading-relaxed">If you received a damaged item or the wrong product, please contact us within <strong>7 days</strong> of delivery with photos. We will send a replacement or issue a full refund at no cost to you.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">How to Request a Return</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Contact us at our support page with your order ID and reason for return.' },
              { step: '2', text: 'We will review your request and respond within 2 business days.' },
              { step: '3', text: 'If approved, we will provide return instructions.' },
              { step: '4', text: 'Once we receive and inspect the item, your refund will be processed within 5–10 business days.' },
            ].map(({ step, text }) => (
              <div key={step} className="flex gap-4 p-4 bg-surface-50 rounded-2xl">
                <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                <p className="text-sm text-ink-secondary">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Non-Returnable Items</h2>
          <p className="text-ink-secondary leading-relaxed">Items that have been used, damaged by the customer, or returned after 30 days are not eligible for return or refund.</p>
        </section>
      </div>
    </div>
  )
}
