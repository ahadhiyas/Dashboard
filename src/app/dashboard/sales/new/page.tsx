
import { createClient } from '@/lib/supabase/server'
import SalesForm from '../sales-form'

export default async function NewSalePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user!.id)
        .single()

    const { data: supermarkets } = await supabase
        .from('supermarkets')
        .select('id, name')
        .eq('distributor_id', distributor!.id)

    const { data: skus } = await supabase
        .from('skus')
        .select('id, weight_label, selling_price, products(name)')
        .eq('products.is_active', true)

    // Fetch ALL pricing rules for this distributor's supermarkets to optimize client lookup
    // In a huge app, this would be an API call on selection. here minimal.
    const { data: pricing } = await supabase
        .from('pricing')
        .select('*')
        .in('supermarket_id', supermarkets?.map(s => s.id) || [])

    return (
        <SalesForm
            supermarkets={supermarkets || []}
            skus={skus || []}
            pricing={pricing || []}
        />
    )
}
