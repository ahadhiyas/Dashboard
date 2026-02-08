
import { getMyInventory } from '../inventory/actions'
import AddStockForm from './add-stock-form'
import { createClient } from '@/lib/supabase/server'
import styles from '../products/products.module.css'

export default async function MyInventoryPage() {
    const inventory = await getMyInventory()
    const supabase = await createClient()

    // Need SKUs for the Add Stock dropdown
    const { data: skus } = await supabase
        .from('skus')
        .select('id, weight_label, products(name)')
        .eq('products.is_active', true)

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>My Inventory</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Variant</th>
                                <th>Available Stock</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item) => (
                                <tr key={item.sku_id}>
                                    <td>{item.product_name}</td>
                                    <td>{item.weight_label}</td>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.stock}</td>
                                    <td>
                                        {item.stock <= 5 ? (
                                            <span style={{ color: 'red', fontSize: '0.8rem' }}>Low Stock</span>
                                        ) : (
                                            <span style={{ color: 'green', fontSize: '0.8rem' }}>Good</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {inventory.length === 0 && (
                                <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>No inventory history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div>
                    <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Record Incoming Stock</h3>
                        <AddStockForm skus={skus || []} />
                    </div>
                </div>
            </div>
        </div>
    )
}
