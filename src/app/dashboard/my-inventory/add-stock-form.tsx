
'use client'

import { useState } from 'react'
import { addIncomingStock } from '../inventory/actions'
import styles from '../products/product-form.module.css'

export default function AddStockForm({ skus }: { skus: any[] }) {
    const [skuId, setSkuId] = useState('')
    const [qty, setQty] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!skuId || !qty) return

        setLoading(true)
        try {
            await addIncomingStock(skuId, Number(qty))
            setQty('')
            setSkuId('')
            alert('Stock added successfully!')
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Group SKUs by Product for easier selection
    // Simplified for now: Just flat list

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.inputGroup}>
                <label>Select Product Variant</label>
                <select
                    required
                    value={skuId}
                    onChange={e => setSkuId(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                    <option value="">-- Select --</option>
                    {skus.map((sku: any) => (
                        <option key={sku.id} value={sku.id}>
                            {sku.products?.name} - {sku.weight_label}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.inputGroup}>
                <label>Quantity Received</label>
                <input
                    type="number"
                    required
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    placeholder="e.g. 50"
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
            </div>

            <button
                type="submit"
                className={styles.saveBtn}
                disabled={loading}
                style={{ width: '100%', marginTop: '0.5rem' }}
            >
                {loading ? 'Adding...' : 'Add Stock'}
            </button>
        </form>
    )
}
