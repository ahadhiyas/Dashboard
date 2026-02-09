import { getDashboardStats } from './actions'
import styles from './page.module.css'
import Link from 'next/link'
import DateRangePicker from '@/components/date-range-picker'

export default async function DashboardPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
    const params = await searchParams // Next.js 15+ needs await for searchParams
    const data: any = await getDashboardStats(params)

    if (!data) return <div className={styles.container}>Loading...</div>

    // Redirect Referrers logic (kept same)
    if (data.role === 'REFERRER') {
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
                <div>
                    <h1>Dashboard</h1>
                    <p style={{ color: '#666', marginTop: '0.2rem' }}>Overview of your business performance</p>
                </div>
                {/* Date Picker for Distributors and Admins */}
                {(data.role === 'DISTRIBUTOR' || data.role === 'ADMIN') && <DateRangePicker />}
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
                    {/* Top Performers Grid */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Top Performers</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            {/* Top Distributors */}
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#64748b' }}>Top Distributors</h3>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <tbody>
                                            {data.topDistributors?.map((d: any, i: number) => (
                                                <tr key={i}>
                                                    <td>{i + 1}. {d.name}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{d.sales.toFixed(0)}</td>
                                                </tr>
                                            ))}
                                            {(!data.topDistributors || data.topDistributors.length === 0) && <tr><td>No data</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Supermarkets */}
                            <div>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#64748b' }}>Top Supermarkets</h3>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <tbody>
                                            {data.topSupermarkets?.map((s: any, i: number) => (
                                                <tr key={i}>
                                                    <td>{i + 1}. {s.name}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{s.sales.toFixed(0)}</td>
                                                </tr>
                                            ))}
                                            {(!data.topSupermarkets || data.topSupermarkets.length === 0) && <tr><td>No data</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product & Distributor Matrix */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Business Overview</h2>
                        </div>

                        {/* Top Products - Premium List View */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.4rem' }}>🏆</span> Top Selling Products
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {data.topProducts?.map((p: any, i: number) => {
                                    const percentageOfMax = data.maxProductSales > 0 ? (p.sales / data.maxProductSales) * 100 : 0;
                                    return (
                                        <div key={i} style={{
                                            background: 'var(--card-bg)',
                                            padding: '1.25rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--card-border)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Background Progress Bar (Subtle) */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                height: '100%',
                                                width: `${percentageOfMax}%`,
                                                background: 'linear-gradient(90deg, rgba(74, 222, 128, 0.05) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                                zIndex: 0
                                            }} />

                                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        background: i === 0 ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'var(--card-border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: i === 0 ? '#fff' : 'var(--foreground)',
                                                        opacity: i === 0 ? 1 : 0.6
                                                    }}>
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{p.quantity} Units Sold</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>₹{p.sales.toLocaleString()}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Revenue</div>
                                                </div>
                                            </div>

                                            {/* Accent Gradient Line at bottom of progress */}
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                height: '2px',
                                                width: `${percentageOfMax}%`,
                                                background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                                                opacity: 0.6
                                            }} />
                                        </div>
                                    );
                                })}
                                {(!data.topProducts || data.topProducts.length === 0) && (
                                    <div className={styles.emptyState}>No sales data for this period.</div>
                                )}
                            </div>
                        </div>

                        {/* Distributor Matrix Table */}
                        <div className={styles.tableContainer}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#64748b' }}>Distributor Performance Matrix</h3>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Distributor</th>
                                        <th>Total Orders</th>
                                        <th>Total Sales</th>
                                        <th>Total Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.distributorOverview?.map((d: any) => (
                                        <tr key={d.name}>
                                            <td style={{ fontWeight: 500 }}>{d.name}</td>
                                            <td>{d.orders}</td>
                                            <td>₹{d.sales.toFixed(2)}</td>
                                            <td style={{
                                                color: d.profit >= 0 ? 'var(--success-color, #10b981)' : 'var(--error-color, #ef4444)',
                                                fontWeight: 600
                                            }}>
                                                ₹{d.profit.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Recent Activity Log (Updated to match new structure) */}
            {data.role !== 'ADMIN' && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Activity</h2>
                        <Link href="/dashboard/sales" className={styles.link}>View All Sales</Link>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Channel</th>
                                    <th>Customer / Supermarket</th>
                                    <th>Items</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentSales?.map((sale: any) => (
                                    <tr key={sale.id}>
                                        <td>{new Date(sale.order_date).toLocaleDateString()}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '1rem',
                                                fontSize: '0.75rem',
                                                background: sale.sales_channel === 'Supermarket' ? '#e3f2fd' : '#f3e5f5',
                                                color: sale.sales_channel === 'Supermarket' ? '#1565c0' : '#7b1fa2'
                                            }}>
                                                {sale.sales_channel}
                                            </span>
                                        </td>
                                        <td>
                                            {sale.sales_channel === 'Supermarket'
                                                ? sale.supermarkets?.name
                                                : sale.customer_name}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {sale.order_items?.map((item: any, i: number) => (
                                                <div key={i}>
                                                    {item.skus?.products?.name} ({item.skus?.weight_label})
                                                </div>
                                            ))}
                                        </td>
                                        <td style={{ fontWeight: 'bold' }}>
                                            ₹{sale.total_amount?.toFixed(2)}
                                        </td>
                                        <td>
                                            <span style={{
                                                color: sale.total_amount - sale.amount_received < 1 ? 'green' : 'orange',
                                                fontWeight: 'bold'
                                            }}>
                                                {sale.total_amount - sale.amount_received < 1 ? 'Paid' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!data.recentSales || data.recentSales.length === 0) && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No recent activity.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
