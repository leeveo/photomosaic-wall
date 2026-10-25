import { serviceDatabase, stripeClient } from '@/lib/server/billing'
import type Stripe from 'stripe'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: 'Webhook unavailable' }, { status: 503 })
  if (!signature) return Response.json({ error: 'Missing signature' }, { status: 400 })
  let event: Stripe.Event
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret) }
  catch { return Response.json({ error: 'Invalid signature' }, { status: 400 }) }
  try {
    let id: string | undefined
    if (event.type === 'checkout.session.completed') {
      const value = event.data.object as Stripe.Checkout.Session
      id = typeof value.subscription === 'string' ? value.subscription : value.subscription?.id
    } else if (['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) id = (event.data.object as Stripe.Subscription).id
    if (!id) return Response.json({ received: true })
    // Always read current Stripe state, so delivery order cannot restore an old entitlement.
    const subscription = await stripeClient().subscriptions.retrieve(id)
    const userId = subscription.metadata.user_id
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ error: 'Subscription owner missing' }, { status: 400 })
    const allowed = subscription.items.data.some(item => item.price.id === process.env.STRIPE_PRICE_ID)
    const period = Math.max(0, ...subscription.items.data.map(item => item.current_period_end))
    const { error } = await serviceDatabase().rpc('apply_billing_event', {
      p_id: event.id, p_created: event.created, p_user: userId,
      p_status: allowed ? subscription.status : 'inactive', p_end: period ? new Date(period * 1000).toISOString() : null,
      p_customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      p_subscription: subscription.id,
    })
    if (error) throw error
    return Response.json({ received: true })
  } catch { return Response.json({ error: 'Webhook processing failed; retry required' }, { status: 500 }) }
}
