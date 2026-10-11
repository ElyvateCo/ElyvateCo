import { NextResponse } from 'next/server'

// Card payments through 2Checkout were removed (the store now uses Cash on
// Delivery, bKash and Nagad), so this endpoint is switched off on purpose:
// nothing should be able to mark an order as paid from outside.
export async function POST() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 })
}
