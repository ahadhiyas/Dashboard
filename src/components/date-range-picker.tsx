'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import styles from './date-range-picker.module.css'

export default function DateRangePicker() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [from, setFrom] = useState(searchParams.get('from') || '')
    const [to, setTo] = useState(searchParams.get('to') || '')

    const applyFilter = () => {
        const params = new URLSearchParams(searchParams)
        if (from) params.set('from', from)
        else params.delete('from')

        if (to) params.set('to', to)
        else params.delete('to')

        router.push(`?${params.toString()}`)
    }

    const clearFilter = () => {
        setFrom('')
        setTo('')
        const params = new URLSearchParams(searchParams)
        params.delete('from')
        params.delete('to')
        router.push(`?${params.toString()}`)
    }

    return (
        <div className={styles.container}>
            <div className={styles.field}>
                <label className={styles.label}>From</label>
                <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label}>To</label>
                <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                />
            </div>

            <div className={styles.actions}>
                <button
                    onClick={applyFilter}
                    className="primary-button"
                    style={{ padding: '0.5rem 1.25rem' }} // Slight override for alignment
                >
                    Apply Filter
                </button>
                {(from || to) && (
                    <button
                        onClick={clearFilter}
                        className={styles.clearBtn}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    )
}
