
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { recordSale } from './actions'
import styles from '../products/product-form.module.css'

type Props = {
    supermarkets: any[]
    skus: any[]
    pricing: any[]
}

export default function SalesForm({ supermarkets, skus, pricing }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [supermarketId, setSupermarketId] = useState('')
    const [skuId, setSkuId] = useState('')
    const [qty, setQty] = useState('')
    const [amountReceived, setAmountReceived] = useState('')

    // Calculate Expected Price
    const currentPrice = useMemo(() => {
        if (!supermarketId || !skuId) return 0
        const p = pricing.find(x => x.supermarket_id === supermarketId && x.sku_id === skuId)
        // Fallback to SKU default selling price if no specific pricing
        if (!p) {
            const sku = skus.find(s => s.id === skuId)
            return sku?.selling_price || 0
        }
        return p.selling_price
    }, [supermarketId, skuId, pricing, skus])

    const totalValue = Number(qty) * currentPrice

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await recordSale({
                supermarket_id: supermarketId,
                sku_id: skuId,
                quantity: Number(qty),
                amount_received: Number(amountReceived)
            })
        } catch (err: any) {
            alert(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>Record Sale</h1>
            </div>

            <div className={styles.section}>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Customer (Supermarket)</label>
                        <select
                            required
                            value={supermarketId}
                            onChange={e => setSupermarketId(e.target.value)}
                            className={styles.inputGroup}
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="">-- Select --</option>
                            {supermarkets.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Product Sold</label>
                        <select
                            required
                            value={skuId}
                            onChange={e => setSkuId(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="">-- Select --</option>
                            {skus.map(s => (
                                <option key={s.id} value={s.id}>{s.products?.name} ({s.weight_label})</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Quantity</label>
                        <input
                            type="number"
                            required
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            placeholder="0"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Unit Price (Configured)</label>
                        <input
                            disabled
                            value={currentPrice.toFixed(2)}
                            style={{ background: '#f5f5f5' }}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Total Value</label>
                        <input
                            disabled
                            value={totalValue.toFixed(2)}
                            style={{ background: '#f5f5f5', fontWeight: 'bold' }}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Amount Received</label>
                        <input
                            type="number"
                            required
                            value={amountReceived}
                            onChange={e => setAmountReceived(e.target.value)}
                            placeholder="0.00"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#666' }}>
                            Outstanding: {(totalValue - Number(amountReceived)).toFixed(2)}
                        </span>
                    </div>

                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Processing...' : 'Confirm Sale'}
                    </button>
                </div>
            </div>
        </form>
    )
}
