
import { createClient } from '@/lib/supabase/server'
import PricingForm from './pricing-form'
import { notFound } from 'next/navigation'
import styles from './pricing.module.css'

export default async function PricingPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch Supermarket details
    const { data: supermarket } = await supabase
        .from('supermarkets')
        .select('name')
        .eq('id', id)
        .single()

    if (!supermarket) notFound()

    // 2. Fetch All Active Products & SKUs
    const { data: products } = await supabase
        .from('products')
        .select('*, skus(*)')
        .eq('is_active', true)

    // 3. Fetch Existing Pricing for this Supermarket
    const { data: existingPricing } = await supabase
        .from('pricing')
        .select('*')
        .eq('supermarket_id', id)

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Pricing Configuration</h1>
                <p className={styles.subtitle}>Manage prices for <strong>{supermarket.name}</strong></p>
            </div>

            <PricingForm
                supermarketId={id}
                products={products || []}
                existingPricing={existingPricing || []}
            />
        </div>
    )
}
