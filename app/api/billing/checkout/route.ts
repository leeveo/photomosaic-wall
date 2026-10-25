import { billingUser, serviceDatabase, siteOrigin, stripeClient } from '@/lib/server/billing'
export async function POST(request: Request) {
  try {
    const user = await billingUser(request)
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 })
    const price = process.env.STRIPE_PRICE_ID
    if (!price) throw new Error('Price missing')
    const db = serviceDatabase()
    const { data: subscription, error } = await db.from('subscriptions').select('stripe_customer_id,stripe_subscription_id,status').eq('user_id', user.id).maybeSingle()
    if (error) throw error
    const stripe = stripeClient()
    const origin = siteOrigin()
    if (subscription?.stripe_customer_id && subscription.stripe_subscription_id && !['canceled','incomplete_expired'].includes(subscription.status)) {
      const portal = await stripe.billingPortal.sessions.create({ customer: subscription.stripe_customer_id, return_url: `${origin}/account` })
      return Response.json({ url: portal.url })
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', line_items: [{ price, quantity: 1 }],
      ...(subscription?.stripe_customer_id ? { customer: subscription.stripe_customer_id } : { customer_email: user.email }),
      client_reference_id: user.id, metadata: { user_id: user.id }, subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/account?checkout=success`, cancel_url: `${origin}/account`,
    }, { idempotencyKey: `checkout-${user.id}-${Math.floor(Date.now() / 1800000)}` })
    return Response.json({ url: session.url })
  } catch { return Response.json({ error: 'Billing temporarily unavailable' }, { status: 503 }) }
}
