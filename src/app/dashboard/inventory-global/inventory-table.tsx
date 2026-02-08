'use client'

import { useState, useMemo } from 'react'
import styles from '../products/products.module.css'
import UpdateStockForm from './update-stock-form'

type InventoryItem = {
    distributor_id: string
    distributor_name: string
    sku_id: string
    product_name: string
    weight_label: string
    stock: number
}

type SortBy = 'distributor' | 'product' | 'variant'

export default function InventoryTable({ inventory }: { inventory: InventoryItem[] }) {
    const [sortBy, setSortBy] = useState<SortBy>('distributor')

    const sortedInventory = useMemo(() => {
        const sorted = [...inventory]

        switch (sortBy) {
            case 'distributor':
                return sorted.sort((a, b) =>
                    a.distributor_name.localeCompare(b.distributor_name) ||
                    a.product_name.localeCompare(b.product_name) ||
                    a.weight_label.localeCompare(b.weight_label)
                )
            case 'product':
                return sorted.sort((a, b) =>
                    a.product_name.localeCompare(b.product_name) ||
                    a.weight_label.localeCompare(b.weight_label) ||
                    a.distributor_name.localeCompare(b.distributor_name)
                )
            case 'variant':
                return sorted.sort((a, b) =>
                    a.weight_label.localeCompare(b.weight_label) ||
                    a.product_name.localeCompare(b.product_name) ||
                    a.distributor_name.localeCompare(b.distributor_name)
                )
            default:
                return sorted
        }
    }, [inventory, sortBy])

    return (
        <>
            {/* Sort Controls */}
            <div style={{
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                background: 'var(--card-bg)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--card-border)'
            }}>
                <label style={{ fontWeight: 600, marginRight: '0.5rem' }}>Sort by:</label>
                <button
                    onClick={() => setSortBy('distributor')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: sortBy === 'distributor' ? 'var(--primary-color)' : 'transparent',
                        color: sortBy === 'distributor' ? 'white' : 'var(--text)',
                        border: `1px solid ${sortBy === 'distributor' ? 'var(--primary-color)' : 'var(--card-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: sortBy === 'distributor' ? 600 : 400,
                        transition: 'all 0.2s'
                    }}
                >
                    Distributor
                </button>
                <button
                    onClick={() => setSortBy('product')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: sortBy === 'product' ? 'var(--primary-color)' : 'transparent',
                        color: sortBy === 'product' ? 'white' : 'var(--text)',
                        border: `1px solid ${sortBy === 'product' ? 'var(--primary-color)' : 'var(--card-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: sortBy === 'product' ? 600 : 400,
                        transition: 'all 0.2s'
                    }}
                >
                    Product
                </button>
                <button
                    onClick={() => setSortBy('variant')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: sortBy === 'variant' ? 'var(--primary-color)' : 'transparent',
                        color: sortBy === 'variant' ? 'white' : 'var(--text)',
                        border: `1px solid ${sortBy === 'variant' ? 'var(--primary-color)' : 'var(--card-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: sortBy === 'variant' ? 600 : 400,
                        transition: 'all 0.2s'
                    }}
                >
                    Variant
                </button>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Distributor</th>
                            <th>Product</th>
                            <th>Variant</th>
                            <th>Current Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInventory.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ fontWeight: '500' }}>{item.distributor_name}</td>
                                <td>{item.product_name}</td>
                                <td>{item.weight_label}</td>
                                <td>
                                    <UpdateStockForm
                                        distributorId={item.distributor_id}
                                        skuId={item.sku_id}
                                        currentStock={item.stock}
                                        distributorName={item.distributor_name}
                                        productName={item.product_name}
                                        weightLabel={item.weight_label}
                                    />
                                </td>
                            </tr>
                        ))}
                        {sortedInventory.length === 0 && (
                            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>No inventory data available.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}
