
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from '../products/products.module.css' // Reusing styles for now
import DeleteDistributorButton from './delete-distributor-button'

export default async function DistributorsPage() {
    const supabase = await createClient()

    const { data: distributors } = await supabase
        .from('distributors')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false })

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Distributors</h1>
                <Link href="/dashboard/distributors/new" className={styles.addButton}>
                    + Register Distributor
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distributors?.map((dist) => (
                            <tr key={dist.id}>
                                <td>{dist.name}</td>
                                <td>{dist.location || '-'}</td>
                                <td>{dist.profiles?.email}</td>
                                <td>
                                    <span className={`${styles.badge} ${dist.is_active ? styles.active : styles.inactive}`}>
                                        {dist.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className={styles.actions}>
                                    <Link href={`/dashboard/distributors/${dist.id}`} className={styles.editBtn}>
                                        View / Edit
                                    </Link>
                                    <DeleteDistributorButton
                                        distributorId={dist.id}
                                        distributorName={dist.name}
                                    />
                                </td>
                            </tr>
                        ))}
                        {distributors?.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>
                                    No distributors found. Register one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
