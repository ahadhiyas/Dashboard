
import { getDashboardStats } from './actions'
import styles from './page.module.css'
import Link from 'next/link'

export default async function DashboardPage() {
    const data: any = await getDashboardStats()

    if (!data) return <div className={styles.container}>Loading...</div>

    // Redirect Referrers to their specific dashboard
    if (data.role === 'REFERRER') {
        // We can't use `redirect` here easily in SC if we already started rendering, 
        // but we can just render the Link or a message.
        // Better: middleware handles it, or we just render a button.
        return (
            <div className={styles.container}>
                <h1>Referrer Dashboard</h1>
                <p>Access your earnings and performance.</p>
                <Link href="/dashboard/referrer-dashboard" className={styles.link} style={{ fontSize: '1.2rem', marginTop: '1rem', display: 'inline-block' }}>
                    Go to My Dashboard &rarr;
                </Link>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Dashboard</h1>
                <p>Overview of your business performance</p>
            </div>

            <div className={styles.statsGrid}>
                {data.stats.map((stat: any, idx: number) => (
                    <div key={idx} className={`${styles.card} ${stat.alert ? styles.cardAlert : ''}`}>
                        <h3>{stat.label}</h3>
                        <div className={styles.value}>
                            {stat.format === 'currency' ? '₹' : ''}{typeof stat.value === 'number' && stat.format === 'currency' ? stat.value.toFixed(2) : stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Admin Specific Sections */}
            {data.role === 'ADMIN' && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Distributor Performance Matrix</h2>
                        </div>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Distributor</th>
                                        <th>Inventory (Items)</th>
                                        <th>Total Sales</th>
                                        <th>Total Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.distributorOverview?.map((d: any) => (
                                        <tr key={d.id}>
                                            <td style={{ fontWeight: 500 }}>{d.name}</td>
                                            <td>{d.stockCount}</td>
                                            <td>₹{d.totalSales.toFixed(2)}</td>
                                            <td style={{
                                                color: d.totalProfit >= 0 ? 'var(--success-color, #10b981)' : 'var(--error-color, #ef4444)',
                                                fontWeight: 600
                                            }}>
                                                ₹{d.totalProfit.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!data.distributorOverview || data.distributorOverview.length === 0) && (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Sales by Channel</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {data.channelSales?.map((c: any, idx: number) => (
                                <div key={idx} style={{
                                    background: 'var(--card-bg)',
                                    padding: '1.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--card-border)'
                                }}>
                                    <h4 style={{ color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'capitalize' }}>{c.channel}</h4>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>₹{c.amount.toFixed(2)}</div>
                                </div>
                            ))}
                            {(!data.channelSales || data.channelSales.length === 0) && (
                                <div style={{ padding: '1rem', color: 'var(--muted)' }}>No sales recorded yet.</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Recent Sales Section (Shared, but mostly for Distributors currently) */}
            {data.role !== 'ADMIN' && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Activity</h2>
                        <Link href="/dashboard/sales" className={styles.link}>View All Sales</Link>
                    </div>

                    {data.recentSales?.length > 0 ? (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Product</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentSales.map((sale: any) => (
                                    <tr key={sale.id}>
                                        <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                        <td>{sale.supermarkets?.name}</td>
                                        <td>{sale.skus?.products?.name}</td>
                                        <td>{sale.total_amount?.toFixed(2)}</td>
                                        <td>
                                            <span className={sale.total_amount - sale.amount_received < 1 ? styles.paid : styles.pending}>
                                                {sale.total_amount - sale.amount_received < 1 ? 'Paid' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={styles.emptyState}>No recent activity found.</div>
                    )}
                </div>
            )}

            {data.role === 'DISTRIBUTOR' && (
                <div className={styles.actionsGrid}>
                    <Link href="/dashboard/sales/new" className={styles.actionCard}>
                        <span className={styles.actionIcon}>💰</span>
                        <span>Record Sale</span>
                    </Link>
                    <Link href="/dashboard/my-inventory" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📦</span>
                        <span>Update Stock</span>
                    </Link>
                    <Link href="/dashboard/products" className={styles.actionCard}>
                        <span className={styles.actionIcon}>🏷️</span>
                        <span>View Products</span>
                    </Link>
                </div>
            )}
        </div>
    )
}
