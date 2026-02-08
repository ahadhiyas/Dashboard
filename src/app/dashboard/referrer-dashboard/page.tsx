
import { createClient } from '@/lib/supabase/server'
import styles from '../page.module.css'

export default async function ReferrerDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Access Denied</div>

    // 1. Fetch My Referrer Profile
    const { data: referrer } = await supabase
        .from('referrers')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!referrer) return <div>Referrer Profile Not Found</div>

    // 2. Fetch Linked Distributors
    const { data: distributors } = await supabase
        .from('distributors')
        .select('id, name, location, is_active')
        .eq('referrer_id', referrer.id)

    const distIds = distributors?.map(d => d.id) || []

    // 3. Calculate Earnings based on Sales of these Distributors
    // Simplification: Sum all sales total_amount for these distributors, then apply %.
    // Optimally we'd do this in DB aggregation.

    const { data: sales } = await supabase
        .from('sales')
        .select('total_amount')
        .in('distributor_id', distIds)

    const totalSalesFromDistributors = sales?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0
    const totalEarnings = totalSalesFromDistributors * (referrer.commission_percentage / 100)

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Referrer Dashboard</h1>
                <p>Welcome, {referrer.name}</p>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3>Total Earnings</h3>
                    <div className={styles.value}>₹{totalEarnings.toFixed(2)}</div>
                    <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>@{referrer.commission_percentage}% of Sales</div>
                </div>
                <div className={styles.card}>
                    <h3>Active Distributors</h3>
                    <div className={styles.value}>{distributors?.filter(d => d.is_active).length || 0}</div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2>My Distributors</h2>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distributors?.map((dist: any) => (
                            <tr key={dist.id}>
                                <td>{dist.name}</td>
                                <td>{dist.location || '-'}</td>
                                <td>
                                    <span style={{ color: dist.is_active ? 'green' : 'grey' }}>{dist.is_active ? 'Active' : 'Inactive'}</span>
                                </td>
                            </tr>
                        ))}
                        {distributors?.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No distributors linked yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
