import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Elyvate',
  description: 'Learn how Elyvate collects, uses, and protects your personal information.',
}

export default function PrivacyPolicy() {
  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-ink-primary mb-2">Privacy Policy</h1>
        <p className="text-ink-muted text-sm mb-10">Last updated: June 2026</p>
        {[
          { title: 'Information We Collect', body: 'When you place an order, we collect your name, email address, phone number, and shipping address. We also collect payment information, which is processed securely by 2Checkout and never stored on our servers.' },
          { title: 'How We Use Your Information', body: 'Your information is used solely to process and fulfill your orders, send order confirmation and tracking emails, and respond to customer support inquiries. We do not sell your personal data to third parties.' },
          { title: 'Data Storage', body: 'Your order data is stored securely using Supabase infrastructure with industry-standard encryption. We retain order data for up to 3 years for legal and accounting purposes.' },
          { title: 'Cookies', body: 'We use essential cookies to maintain your shopping cart and session. We do not use tracking or advertising cookies.' },
          { title: 'Your Rights', body: 'You have the right to request access to, correction of, or deletion of your personal data. To exercise these rights, please contact us through our contact page.' },
          { title: 'Contact', body: 'If you have any questions about this privacy policy, please reach out via our contact page.' },
        ].map(({ title, body }) => (
          <section key={title} className="mb-8">
            <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">{title}</h2>
            <p className="text-ink-secondary leading-relaxed">{body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
