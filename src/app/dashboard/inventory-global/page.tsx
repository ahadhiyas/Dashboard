
import { getGlobalInventory } from '../inventory/actions'
import styles from '../products/products.module.css'
import Link from 'next/link'
import InventoryTable from './inventory-table'

export default async function GlobalInventoryPage() {
    const inventory = await getGlobalInventory()

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.title}>Global Inventory Overview</h1>
                <Link href="/dashboard/inventory-global/add-delivery" className={styles.addButton}>
                    + Add Delivery
                </Link>
            </div>

            <InventoryTable inventory={inventory} />
        </div>
    )
}
