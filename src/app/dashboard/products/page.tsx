
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './products.module.css'
import DeleteProductButton from './delete-product-button'

export default async function ProductsPage() {
    const supabase = await createClient()
    const { data: products } = await supabase
        .from('products')
        .select('*, skus(count)')
        .order('created_at', { ascending: false })

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Product Catalog</h1>
                <Link href="/dashboard/products/new" className={styles.addButton}>
                    + Add Product
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>SKUs</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products?.map((product) => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{product.category || '-'}</td>
                                <td>
                                    <span className={`${styles.badge} ${product.is_active ? styles.active : styles.inactive}`}>
                                        {product.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>{product.skus[0].count} Variants</td>
                                <td className={styles.actions}>
                                    <Link href={`/dashboard/products/${product.id}`} className={styles.editBtn}>
                                        Edit
                                    </Link>
                                    <DeleteProductButton
                                        productId={product.id}
                                        productName={product.name}
                                    />
                                </td>
                            </tr>
                        ))}
                        {products?.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>
                                    No products found. Add one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
