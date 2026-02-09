
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

    // Check Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'ADMIN'

    // Fetch Orders
    let query = supabase
        .from('orders')
        .select(`
            *,
            supermarkets (name),
            order_items (
                quantity,
                skus (
                    weight_label,
                    products (name)
                )
            )
        `)
        .order('order_date', { ascending: false })

    if (!isAdmin && distributor) {
        query = query.eq('distributor_id', distributor.id)
    }

    const { data: orders } = await query

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Sales Log</h1>
                <Link href="/dashboard/sales/new" className={styles.addButton}>
                    + Record Sale
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Channel</th>
                            <th>Customer / Supermarket</th>
                            <th>Items</th>
                            <th>Total Value</th>
                            <th>Status</th>
                            <th>Comments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders?.map((order: any) => (
                            <tr key={order.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{order.order_ref}</td>
                                <td>{new Date(order.order_date).toLocaleDateString()}</td>
                                <td>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        background: order.sales_channel === 'Supermarket' ? '#e3f2fd' : '#f3e5f5',
                                        color: order.sales_channel === 'Supermarket' ? '#1565c0' : '#7b1fa2'
                                    }}>
                                        {order.sales_channel}
                                    </span>
                                </td>
                                <td>
                                    {order.sales_channel === 'Supermarket'
                                        ? order.supermarkets?.name
                                        : order.customer_name}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>
                                    {order.order_items?.map((item: any, i: number) => (
                                        <div key={i}>
                                            {item.skus?.products?.name} ({item.skus?.weight_label}) x {item.quantity}
                                        </div>
                                    ))}
                                </td>
                                <td style={{ fontWeight: 'bold' }}>
                                    {order.total_amount?.toFixed(2)}
                                </td>
                                <td>
                                    <span style={{
                                        color: order.payment_status === 'PAID' ? 'green' :
                                            order.payment_status === 'CANCELLED' ? 'red' : 'orange',
                                        fontWeight: 'bold'
                                    }}>
                                        {order.payment_status}
                                    </span>
                                </td>
                                <td style={{ maxWidth: '200px', fontSize: '0.8rem', color: '#666' }}>{order.comments || '-'}</td>
                                <td>
                                    <Link
                                        href={`/dashboard/sales/${order.id}/edit`}
                                        style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontSize: '0.85rem' }}
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {orders?.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center' }}>No sales recorded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
