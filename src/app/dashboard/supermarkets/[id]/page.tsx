
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from '../../products/products.module.css'
import DeleteSupermarketButton from './delete-button'

export default async function SupermarketDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: supermarket } = await supabase
        .from('supermarkets')
        .select('*, distributors(name)')
        .eq('id', id)
        .single()

    if (!supermarket) {
        notFound()
    }

    // Get stock at this supermarket
    // Stock = SUM of quantities from sales where supermarket_id = this one
    const { data: stockData } = await supabase
        .from('sales')
        .select('sku_id, quantity, skus(id, weight_label, products(name))')
        .eq('supermarket_id', id)

    // Aggregate stock by SKU
    const stockBySku = new Map<string, { sku: any, totalQty: number }>()

    stockData?.forEach((sale: any) => {
        const skuId = sale.sku_id
        const existing = stockBySku.get(skuId)
        if (existing) {
            existing.totalQty += sale.quantity
        } else {
            stockBySku.set(skuId, {
                sku: sale.skus,
                totalQty: sale.quantity
            })
        }
    })

    const stockArray = Array.from(stockBySku.values())

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>{supermarket.name}</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href={`/dashboard/supermarkets/${id}/edit`} className={styles.addButton}>
                        Edit
                    </Link>
                    <DeleteSupermarketButton supermarketId={id} />
                </div>
            </div>

            {/* Details Section */}
            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                marginBottom: '2rem'
            }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Details</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem'
                }}>
                    <div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Supermarket Name</div>
                        <div style={{ fontWeight: 500 }}>{supermarket.name}</div>
                    </div>

                    {supermarket.area && (
                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Area</div>
                            <div style={{ fontWeight: 500 }}>{supermarket.area}</div>
                        </div>
                    )}

                    {supermarket.location && (
                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Location</div>
                            <div style={{ fontWeight: 500 }}>{supermarket.location}</div>
                        </div>
                    )}

                    {supermarket.contact_person && (
                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Contact Person</div>
                            <div style={{ fontWeight: 500 }}>{supermarket.contact_person}</div>
                        </div>
                    )}

                    {supermarket.phone_no && (
                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Phone</div>
                            <div style={{ fontWeight: 500 }}>{supermarket.phone_no}</div>
                        </div>
                    )}

                    {supermarket.type && (
                        <div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Type</div>
                            <span className={`${styles.badge} ${styles.inactive}`}>{supermarket.type}</span>
                        </div>
                    )}
                </div>

                {supermarket.comments && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Comments</div>
                        <div style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{supermarket.comments}</div>
                    </div>
                )}
            </div>

            {/* Stock Section */}
            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem'
            }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Stock at this Supermarket</h2>

                {stockArray.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        No stock records found. Products will appear here once sales are recorded.
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Variant</th>
                                    <th>Total Quantity Delivered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockArray.map((item) => (
                                    <tr key={item.sku.id}>
                                        <td>{item.sku.products?.name || 'Unknown'}</td>
                                        <td>{item.sku.weight_label}</td>
                                        <td>
                                            <strong>{item.totalQty}</strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
