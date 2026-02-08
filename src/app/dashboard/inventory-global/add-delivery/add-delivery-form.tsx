'use client'

import { useState } from 'react'
import { addInventoryDelivery, type DeliveryItem } from '../../inventory/actions'
import styles from '../../products/product-form.module.css'

type AddDeliveryFormProps = {
    distributors: any[]
    skus: any[]
}

export default function AddDeliveryForm({ distributors, skus }: AddDeliveryFormProps) {
    const [distributorId, setDistributorId] = useState('')
    const [items, setItems] = useState<DeliveryItem[]>([{ sku_id: '', quantity: 0 }])
    const [loading, setLoading] = useState(false)

    const handleAddItem = () => {
        setItems([...items, { sku_id: '', quantity: 0 }])
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: 'sku_id' | 'quantity', value: string | number) => {
        const newItems = [...items]
        if (field === 'sku_id') {
            newItems[index].sku_id = value as string
        } else {
            newItems[index].quantity = Number(value)
        }
        setItems(newItems)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!distributorId) {
            alert('Please select a distributor')
            return
        }

        const validItems = items.filter(item => item.sku_id && item.quantity > 0)
        if (validItems.length === 0) {
            alert('Please add at least one product with quantity')
            return
        }

        setLoading(true)
        try {
            await addInventoryDelivery(distributorId, validItems)
            alert('Delivery logged successfully!')

            // Reset form
            setDistributorId('')
            setItems([{ sku_id: '', quantity: 0 }])
        } catch (err: any) {
            alert(err.message || 'Failed to log delivery')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Distributor *</label>
                <select
                    required
                    value={distributorId}
                    onChange={e => setDistributorId(e.target.value)}
                    className={styles.input}
                >
                    <option value="">-- Select Distributor --</option>
                    {distributors.map((dist: any) => (
                        <option key={dist.id} value={dist.id}>
                            {dist.name}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Products</h3>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        + Add Product
                    </button>
                </div>

                {items.map((item, index) => (
                    <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr auto',
                        gap: '1rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '8px'
                    }}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Product Variant *</label>
                            <select
                                required
                                value={item.sku_id}
                                onChange={e => handleItemChange(index, 'sku_id', e.target.value)}
                                className={styles.input}
                            >
                                <option value="">-- Select Product --</option>
                                {skus.map((sku: any) => (
                                    <option key={sku.id} value={sku.id}>
                                        {sku.products?.name} - {sku.weight_label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Quantity *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={item.quantity || ''}
                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                placeholder="0"
                                className={styles.input}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                    type="submit"
                    className={styles.saveBtn}
                    disabled={loading}
                    style={{ flex: 1 }}
                >
                    {loading ? 'Logging Delivery...' : 'Log Delivery'}
                </button>
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className={styles.cancelBtn}
                    disabled={loading}
                    style={{ flex: 1 }}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
