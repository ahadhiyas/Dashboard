
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createShipment } from './actions'
import styles from '../products/product-form.module.css'

type Props = {
    supermarkets: any[]
    skus: any[]
}

export default function ShipmentForm({ supermarkets, skus }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form State
    const [supermarketId, setSupermarketId] = useState('')
    const [skuId, setSkuId] = useState('')
    const [qty, setQty] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await createShipment({
                supermarket_id: supermarketId,
                sku_id: skuId,
                quantity: Number(qty)
            })
        } catch (err: any) {
            alert(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>Record Shipment</h1>
            </div>

            <div className={styles.section}>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Destination Supermarket</label>
                        <select
                            required
                            value={supermarketId}
                            onChange={e => setSupermarketId(e.target.value)}
                            className={styles.inputGroup}
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="">-- Select Supermarket --</option>
                            {supermarkets.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Product Variant</label>
                        <select
                            required
                            value={skuId}
                            onChange={e => setSkuId(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="">-- Select Product --</option>
                            {skus.map(s => (
                                <option key={s.id} value={s.id}>{s.products?.name} ({s.weight_label})</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Quantity to Ship</label>
                        <input
                            type="number"
                            required
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            placeholder="e.g. 20"
                        />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Processing...' : 'Confirm Shipment'}
                    </button>
                </div>
            </div>
        </form>
    )
}
