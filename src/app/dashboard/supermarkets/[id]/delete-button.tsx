'use client'

import { useState } from 'react'
import { deleteSupermarket } from '../actions'
import { useRouter } from 'next/navigation'

export default function DeleteSupermarketButton({ supermarketId }: { supermarketId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this supermarket? This action cannot be undone.')) {
            return
        }

        setLoading(true)
        try {
            await deleteSupermarket(supermarketId)
            router.push('/dashboard/supermarkets')
        } catch (err: any) {
            alert(err.message || 'Failed to delete supermarket')
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            style={{
                background: '#dc2626',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
            }}
        >
            {loading ? 'Deleting...' : 'Delete'}
        </button>
    )
}
