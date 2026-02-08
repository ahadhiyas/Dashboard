'use client'

import { useState } from 'react'
import { deleteProduct } from './actions'
import styles from './products.module.css'

type DeleteProductButtonProps = {
    productId: string
    productName: string
}

export default function DeleteProductButton({ productId, productName }: DeleteProductButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        setIsDeleting(true)
        setError('')

        try {
            await deleteProduct(productId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete product')
            setIsDeleting(false)
        }
    }

    if (!showConfirm) {
        return (
            <button
                onClick={() => setShowConfirm(true)}
                className={styles.deleteBtn}
                style={{ marginLeft: '0.5rem' }}
            >
                Delete
            </button>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                marginBottom: '0.5rem'
            }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>
                    Delete "{productName}"? This will also delete all variants and cannot be undone.
                </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                    }}
                >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                    onClick={() => {
                        setShowConfirm(false)
                        setError('')
                    }}
                    disabled={isDeleting}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
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
