import { billingUser, serviceDatabase, siteOrigin, stripeClient } from '@/lib/server/billing'
export async function POST(request: Request) {
  try {
    const user = await billingUser(request)
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 })
    const { data, error } = await serviceDatabase().from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).single()
    if (error || !data?.stripe_customer_id) return Response.json({ error: 'No billing account' }, { status: 409 })
    const portal = await stripeClient().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${siteOrigin()}/account` })
    return Response.json({ url: portal.url })
  } catch { return Response.json({ error: 'Billing temporarily unavailable' }, { status: 503 }) }
}
