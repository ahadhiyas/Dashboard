
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from '../products/products.module.css' // Reusing styles

export default async function SupermarketsPage() {
    const supabase = await createClient()

    // Verify we are a distributor first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Please log in</div>

    // Check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'ADMIN'

    // RLS will handle filtering by auth.uid -> distributor -> supermarkets
    // But we need to make sure we are querying correctly
    let query = supabase
        .from('supermarkets')
        .select('*, distributors(name)')
        .order('created_at', { ascending: false })

    const { data: supermarkets, error } = await query

    if (error) {
        return <div style={{ padding: '2rem', color: 'red' }}>Error loading supermarkets. You might not be registered.</div>
    }

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>My Supermarkets</h1>
                <Link href="/dashboard/supermarkets/new" className={styles.addButton}>
                    + Add Supermarket
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            {isAdmin && <th>Distributor</th>}
                            <th>Area</th>
                            <th>Contact Person</th>
                            <th>Phone</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {supermarkets?.map((market) => (
                            <tr key={market.id}>
                                <td>{market.name}</td>
                                {isAdmin && (
                                    <td style={{ fontSize: '0.85rem', color: 'var(--color-primary-dark)' }}>
                                        {market.distributors?.name || '-'}
                                    </td>
                                )}
                                <td>{market.area || '-'}</td>
                                <td>{market.contact_person || '-'}</td>
                                <td>{market.phone_no || '-'}</td>
                                <td>
                                    {market.type && (
                                        <span className={`${styles.badge} ${styles.inactive}`}>
                                            {market.type}
                                        </span>
                                    )}
                                    {!market.type && '-'}
                                </td>
                                <td className={styles.actions}>
                                    <Link href={`/dashboard/supermarkets/${market.id}`} className={styles.editBtn}>
                                        View
                                    </Link>
                                    <span style={{ color: '#ddd' }}>|</span>
                                    <Link href={`/dashboard/supermarkets/${market.id}/pricing`} className={styles.editBtn}>
                                        Pricing
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {supermarkets?.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>
                                    No supermarkets found. Add one to start selling.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
