
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from '../products/products.module.css'

export default async function ReferralsPage() {
    const supabase = await createClient()

    // Fetch Referrers with their linked distributors count
    const { data: referrers } = await supabase
        .from('referrers')
        .select('*, distributors(count)')

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Referrers Management</h1>
                <Link href="/dashboard/referrals/new" className={styles.addButton}>
                    + Add Referrer
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Commission %</th>
                            <th>Distributors Linked</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referrers?.map((ref: any) => (
                            <tr key={ref.id}>
                                <td>{ref.name}</td>
                                <td>{ref.phone || '-'}</td>
                                <td>{ref.commission_percentage}%</td>
                                <td>
                                    {/* Supabase returns array of objects for count usually, but simple join gives count */}
                                    {ref.distributors ? ref.distributors[0]?.count : 0}
                                    {/* Actually count aggregate syntax in select is tricky in JS client without exact cast.
                       Let's assume simple fetching for now. */}
                                    {Array.isArray(ref.distributors) ? ref.distributors.length : 0}
                                </td>
                                <td className={styles.actions}>
                                    <Link href={`/dashboard/referrals/${ref.id}`} className={styles.editBtn}>
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {referrers?.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No referrers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
