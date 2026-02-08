
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from '../products/products.module.css'

export default async function SalesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Access Denied</div>

    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    const { data: sales } = await supabase
        .from('sales')
        .select('*, supermarkets(name), skus(weight_label, products(name))')
        .eq('distributor_id', distributor?.id)
        .order('sale_date', { ascending: false })

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Sales & Collections</h1>
                <Link href="/dashboard/sales/new" className={styles.addButton}>
                    + Record Sale
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Supermarket</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Total Value</th>
                            <th>Received</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales?.map((sale: any) => (
                            <tr key={sale.id}>
                                <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                <td>{sale.supermarkets?.name}</td>
                                <td>{sale.skus?.products?.name} ({sale.skus?.weight_label})</td>
                                <td>{sale.quantity}</td>
                                <td>{sale.total_amount?.toFixed(2) || '-'}</td>
                                <td>{sale.amount_received?.toFixed(2)}</td>
                                <td style={{
                                    color: (sale.total_amount - sale.amount_received) > 0.1 ? 'red' : 'green',
                                    fontWeight: 'bold'
                                }}>
                                    {((sale.total_amount || 0) - sale.amount_received).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {sales?.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>No sales recorded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
