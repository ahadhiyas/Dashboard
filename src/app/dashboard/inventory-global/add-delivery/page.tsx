import { createClient } from '@/lib/supabase/server'
import AddDeliveryForm from './add-delivery-form'
import styles from '../../products/products.module.css'

export default async function AddDeliveryPage() {
    const supabase = await createClient()

    // Get all active distributors
    const { data: distributors } = await supabase
        .from('distributors')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

    // Get all SKUs with product info
    const { data: skus } = await supabase
        .from('skus')
        .select('id, weight_label, products(name)')
        .order('weight_label')

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Add Inventory Delivery</h1>
            </div>

            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                maxWidth: '900px'
            }}>
                <AddDeliveryForm
                    distributors={distributors || []}
                    skus={skus || []}
                />
            </div>
        </div>
    )
}
