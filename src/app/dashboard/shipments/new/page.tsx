
import { createClient } from '@/lib/supabase/server'
import ShipmentForm from '../shipment-form'

export default async function NewShipmentPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch Distributor ID
    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user!.id)
        .single()

    // Fetch My Supermarkets
    const { data: supermarkets } = await supabase
        .from('supermarkets')
        .select('id, name')
        .eq('distributor_id', distributor!.id)

    // Fetch My Products (All active)
    const { data: skus } = await supabase
        .from('skus')
        .select('id, weight_label, products(name)')
        .eq('products.is_active', true)

    return <ShipmentForm supermarkets={supermarkets || []} skus={skus || []} />
}
