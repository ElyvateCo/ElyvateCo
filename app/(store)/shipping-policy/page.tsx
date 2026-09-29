import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipping Policy — Elyvate',
  description: 'Learn about Elyvate\'s shipping times, costs, and order tracking. Free worldwide shipping on all orders.',
}

export default function ShippingPolicy() {
  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-3xl prose-custom">
        <h1 className="font-display text-3xl font-semibold text-ink-primary mb-2">Shipping Policy</h1>
        <p className="text-ink-muted text-sm mb-10">Last updated: June 2026</p>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Processing Time</h2>
          <p className="text-ink-secondary leading-relaxed">All orders are processed within <strong>1–3 business days</strong> after payment is confirmed. Orders placed on weekends or public holidays will be processed the next business day.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Shipping Times</h2>
          <div className="bg-surface-50 rounded-2xl overflow-hidden border border-surface-200">
            <table className="w-full text-sm">
              <thead className="bg-surface-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-ink-primary">Region</th>
                  <th className="text-left px-5 py-3 font-semibold text-ink-primary">Estimated Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {[
                  ['United States', '7–14 business days'],
                  ['United Kingdom', '7–14 business days'],
                  ['Canada / Australia', '10–18 business days'],
                  ['Europe', '8–15 business days'],
                  ['Rest of World', '12–25 business days'],
                ].map(([region, time]) => (
                  <tr key={region}>
                    <td className="px-5 py-3 text-ink-secondary">{region}</td>
                    <td className="px-5 py-3 text-ink-primary font-medium">{time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-ink-muted text-xs mt-3">Delivery times are estimates and may vary due to customs processing, holidays, or carrier delays.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Shipping Cost</h2>
          <p className="text-ink-secondary leading-relaxed">We offer <strong>free worldwide shipping</strong> on all orders. No minimum order required.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Order Tracking</h2>
          <p className="text-ink-secondary leading-relaxed">Once your order has been shipped, you will receive a tracking number via email. You can also track your order anytime at <a href="/track-order" className="text-brand-600 hover:underline">elyvate.com/track-order</a> using your Order ID and email address.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Customs & Duties</h2>
          <p className="text-ink-secondary leading-relaxed">International orders may be subject to customs fees, import duties, or taxes imposed by your country. These charges are the buyer's responsibility and are not included in our pricing. We recommend checking with your local customs office before ordering.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-3">Questions?</h2>
          <p className="text-ink-secondary leading-relaxed">If you have any questions about your shipment, please <a href="/contact" className="text-brand-600 hover:underline">contact us</a> and we'll be happy to help.</p>
        </section>
      </div>
    </div>
  )
}
