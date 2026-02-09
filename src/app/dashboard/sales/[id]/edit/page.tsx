import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderForm from '../../order-form'

export default async function EditOrderPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Fetch Order Details with Items
    const { data: order } = await supabase
        .from('orders')
        .select(`
            *,
            items: order_items(
                sku_id,
                quantity,
                price_per_unit,
                skus (
                    product_id
                )
            )
        `)
        .eq('id', id)
        .single()

    if (!order) notFound()

    // 2. Fetch Products
    const { data: products } = await supabase
        .from('products')
        .select('*, skus(id, weight_label, min_selling_price)')
        .eq('is_active', true)
        .order('name')

    // 3. Fetch Supermarkets
    const { data: supermarkets } = await supabase
        .from('supermarkets')
        .select('*')
        .order('name')

    // 4. Fetch Distributors (for Admin)
    let distributors = undefined
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'ADMIN') {
            const { data } = await supabase.from('distributors').select('id, name').order('name')
            distributors = data || []
        }
    }

    return (
        <OrderForm
            initialData={order}
            products={products || []}
            supermarkets={supermarkets || []}
            distributors={distributors}
        />
    )
}
