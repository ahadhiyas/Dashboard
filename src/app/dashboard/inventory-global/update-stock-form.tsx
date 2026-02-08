'use client'

import { useState } from 'react'
import { updateDistributorStock } from '../inventory/actions'
import styles from '../products/products.module.css'

type UpdateStockFormProps = {
    distributorId: string
    skuId: string
    currentStock: number
    distributorName: string
    productName: string
    weightLabel: string
}

export default function UpdateStockForm({
    distributorId,
    skuId,
    currentStock,
    distributorName,
    productName,
    weightLabel
}: UpdateStockFormProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [newStock, setNewStock] = useState(currentStock)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        setIsLoading(true)
        setError('')

        try {
            await updateDistributorStock(distributorId, skuId, newStock)
            setIsEditing(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update stock')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        setNewStock(currentStock)
        setIsEditing(false)
        setError('')
    }

    if (!isEditing) {
        return (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{
                    padding: '0.2rem 0.5rem',
                    background: currentStock > 0 ? '#e6fffa' : '#fff5f5',
                    color: currentStock > 0 ? '#047857' : '#c53030',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}>
                    {currentStock}
                </span>
                <button
                    onClick={() => setIsEditing(true)}
                    className={styles.editBtn}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                >
                    Edit
                </button>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                    disabled={isLoading}
                    style={{
                        width: '80px',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                    }}
                />
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    style={{
                        padding: '0.25rem 0.75rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    style={{
                        padding: '0.25rem 0.75rem',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Cancel
                </button>
            </div>
            {error && (
                <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{error}</span>
            )}
        </div>
    )
}
