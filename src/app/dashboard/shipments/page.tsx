
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from '../products/products.module.css'

export default async function ShipmentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Access Denied</div>

    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!distributor) return <div>Distributor not found</div>

    const { data: shipments } = await supabase
        .from('inventory_events')
        .select('quantity, event_date, skus(weight_label, products(name))')
        .eq('distributor_id', distributor.id)
        .eq('type', 'SENT')
        .order('event_date', { ascending: false })

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Shipments</h1>
                <Link href="/dashboard/shipments/new" className={styles.addButton}>
                    + New Shipment
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Product</th>
                            <th>Variant</th>
                            <th>Quantity Shipped</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments?.map((s: any, idx: number) => (
                            <tr key={idx}>
                                <td>{new Date(s.event_date).toLocaleDateString()}</td>
                                <td>{s.skus?.products?.name}</td>
                                <td>{s.skus?.weight_label}</td>
                                <td style={{ fontWeight: 'bold' }}>{s.quantity}</td>
                            </tr>
                        ))}
                        {shipments?.length === 0 && (
                            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>No shipments recorded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
