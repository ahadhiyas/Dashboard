
'use client'

import { useState } from 'react'
import { savePricing, type PricingInput } from './actions'
import styles from './pricing.module.css'
import { useRouter } from 'next/navigation'

type PricingFormProps = {
    supermarketId: string
    products: any[]
    existingPricing: any[]
}

export default function PricingForm({ supermarketId, products, existingPricing }: PricingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    // Initialize state map: sku_id -> PricingInput
    const [pricingMap, setPricingMap] = useState<Record<string, PricingInput>>(() => {
        const map: Record<string, PricingInput> = {}

        products.forEach(p => {
            p.skus.forEach((sku: any) => {
                const found = existingPricing.find(ep => ep.sku_id === sku.id)
                if (found) {
                    map[sku.id] = {
                        supermarket_id: supermarketId,
                        sku_id: sku.id,
                        selling_price: found.selling_price,
                        commission_type: found.commission_type,
                        commission_value: found.commission_value
                    }
                } else {
                    // Default: Use SKU standard selling price, 0 commission
                    map[sku.id] = {
                        supermarket_id: supermarketId,
                        sku_id: sku.id,
                        selling_price: sku.selling_price,
                        commission_type: 'PERCENTAGE',
                        commission_value: 0
                    }
                }
            })
        })
        return map
    })

    const handleChange = (skuId: string, field: keyof PricingInput, value: any) => {
        setPricingMap(prev => ({
            ...prev,
            [skuId]: {
                ...prev[skuId],
                [field]: value
            }
        }))
    }

    const calculateNet = (p: PricingInput) => {
        let commAmount = 0
        if (p.commission_type === 'PERCENTAGE') {
            commAmount = p.selling_price * (p.commission_value / 100)
        } else {
            commAmount = p.commission_value
        }
        return p.selling_price - commAmount
    }

    const handleSave = async () => {
        setLoading(true)
        setMsg(null)
        const payload = Object.values(pricingMap)

        try {
            await savePricing(supermarketId, payload)
            setMsg('Pricing saved successfully!')
            setTimeout(() => setMsg(null), 3000)
        } catch (err: any) {
            setMsg('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.formContainer}>
            {msg && <div style={{ padding: '1rem', background: msg.includes('Error') ? '#fee' : '#eef', color: msg.includes('Error') ? 'red' : 'green', textAlign: 'center' }}>{msg}</div>}

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Product / SKU</th>
                        <th>Default Price</th>
                        <th>Selling Price</th>
                        <th>Comm. Type</th>
                        <th>Comm. Value</th>
                        <th>Distributor Net</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(product => (
                        <>
                            <tr key={product.id} className={styles.productRow}>
                                <td colSpan={6}>{product.name}</td>
                            </tr>
                            {product.skus.map((sku: any) => {
                                const p = pricingMap[sku.id]
                                if (!p) return null

                                return (
                                    <tr key={sku.id} className={styles.skuRow}>
                                        <td style={{ paddingLeft: '2rem' }}>
                                            {sku.weight_label}
                                        </td>
                                        <td style={{ opacity: 0.6 }}>
                                            {sku.selling_price.toFixed(2)}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className={styles.input}
                                                value={p.selling_price}
                                                onChange={(e) => handleChange(sku.id, 'selling_price', Number(e.target.value))}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                className={styles.select}
                                                value={p.commission_type}
                                                onChange={(e) => handleChange(sku.id, 'commission_type', e.target.value)}
                                            >
                                                <option value="PERCENTAGE">%</option>
                                                <option value="FLAT">Flat</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className={styles.input}
                                                value={p.commission_value}
                                                onChange={(e) => handleChange(sku.id, 'commission_value', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className={styles.netValue}>
                                            {calculateNet(p).toFixed(2)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </>
                    ))}
                </tbody>
            </table>

            <div className={styles.actionsBar}>
                <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
