'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder, updateOrder, type OrderInput } from './actions'
import styles from '../products/product-form.module.css' // Reusing consistent styles

type OrderFormProps = {
    initialData?: any // For edit mode
    products: any[] // Needed for dropdown
    supermarkets: any[] // Needed for dropdown
    distributors?: any[] // For Admin override
}

// Helper to get formatted Price
const formatPrice = (p: number) => p?.toFixed(2) || '0.00'

export default function OrderForm({ initialData, products, supermarkets, distributors }: OrderFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [channel, setChannel] = useState<string>(initialData?.sales_channel || 'Supermarket')
    const [customerName, setCustomerName] = useState<string>(initialData?.customer_name || '')
    const [supermarketId, setSupermarketId] = useState<string>(initialData?.supermarket_id || '')
    const [distributorId, setDistributorId] = useState<string>(initialData?.distributor_id || (distributors && distributors.length > 0 ? distributors[0].id : undefined))

    const [paymentStatus, setPaymentStatus] = useState<string>(initialData?.payment_status || 'PENDING')
    const [amountReceived, setAmountReceived] = useState<number>(initialData?.amount_received || 0)
    const [comments, setComments] = useState<string>(initialData?.comments || '')
    const [orderDate, setOrderDate] = useState<string>(initialData?.order_date ? new Date(initialData.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

    // Items State
    const [items, setItems] = useState<Array<{ sku_id: string, quantity: number, price_per_unit: number, product_id: string }>>(
        initialData?.items?.map((item: any) => ({
            sku_id: item.sku_id,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            product_id: item.skus?.product_id || products.find(p => p.skus.some((s: any) => s.id === item.sku_id))?.id || ''
        })) || [{ sku_id: '', quantity: 1, price_per_unit: 0, product_id: '' }]
    )

    // Calculate Total
    const totalOrderValue = items.reduce((acc, item) => acc + (item.quantity * item.price_per_unit), 0)

    // Handle Item Changes
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]

        if (field === 'product_id') {
            // Reset SKU when product changes
            newItems[index] = { ...newItems[index], product_id: value, sku_id: '', price_per_unit: 0 }
        } else if (field === 'sku_id') {
            // Find SKU price and set it
            const product = products.find(p => p.id === newItems[index].product_id)
            const sku = product?.skus.find((s: any) => s.id === value)
            const price = sku?.min_selling_price || 0
            newItems[index] = { ...newItems[index], sku_id: value, price_per_unit: price }
        } else {
            // Qty or Price manual override
            newItems[index] = { ...newItems[index], [field]: value }
        }

        setItems(newItems)
    }

    const addItem = () => {
        setItems([...items, { sku_id: '', quantity: 1, price_per_unit: 0, product_id: '' }])
    }

    const removeItem = (index: number) => {
        if (items.length === 1) return
        setItems(items.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Validation
        if (channel === 'Supermarket' && !supermarketId) {
            setError('Please select a supermarket')
            setLoading(false)
            return
        }
        if (channel !== 'Supermarket' && !customerName) {
            setError('Please enter customer name')
            setLoading(false)
            return
        }
        if (items.some(i => !i.sku_id || i.quantity <= 0)) {
            setError('Please select valid products and quantities')
            setLoading(false)
            return
        }

        const payload: OrderInput = {
            distributor_id: distributorId, // Only used if admin prop passed & logic allows
            sales_channel: channel as any,
            customer_name: channel === 'Supermarket' ? undefined : customerName,
            supermarket_id: channel === 'Supermarket' ? supermarketId : undefined,
            payment_status: paymentStatus as any,
            amount_received: amountReceived,
            comments,
            order_date: orderDate,
            items: items.map(i => ({
                sku_id: i.sku_id,
                quantity: i.quantity,
                price_per_unit: i.price_per_unit
            }))
        }

        try {
            const res = initialData?.id
                ? await updateOrder(initialData.id, payload)
                : await createOrder(payload)

            // If createOrder returns object, we need to handle redirect manually if not done in server
            // But server action does redirect.

        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer} style={{ maxWidth: '900px' }}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>{initialData ? 'Edit Order' : 'New Order / Shipment'}</h1>
                <div className={styles.actions}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Order'}
                    </button>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* General Info */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Order Details</h3>
                <div className={styles.grid}>
                    {/* Admin: Distributor Selection */}
                    {distributors && (
                        <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                            <label>Distributor (Admin Only)</label>
                            <select
                                value={distributorId || ''}
                                onChange={e => setDistributorId(e.target.value)}
                            >
                                <option value="">Select Distributor...</option>
                                {distributors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Date</label>
                        <input
                            type="date"
                            required
                            value={orderDate}
                            onChange={e => setOrderDate(e.target.value)}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Channel</label>
                        <select
                            value={channel}
                            onChange={e => {
                                setChannel(e.target.value)
                                // Reset related fields if needed? 
                                // Keep values for UX smoothness
                            }}
                        >
                            <option value="Supermarket">Supermarket</option>
                            <option value="Whatsapp">Whatsapp</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Website">Website</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {channel === 'Supermarket' ? (
                        <div className={styles.inputGroup}>
                            <label>Supermarket</label>
                            <select
                                value={supermarketId}
                                onChange={e => setSupermarketId(e.target.value)}
                                required
                            >
                                <option value="">Select Supermarket...</option>
                                {supermarkets.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - {s.area}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className={styles.inputGroup}>
                            <label>Customer Name</label>
                            <input
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Enter customer name..."
                                required
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Products / Items */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h1 className={styles.sectionTitle}>Items</h1>
                    <button type="button" onClick={addItem} className={styles.addButton} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        + Add Item
                    </button>
                </div>

                <div className={styles.skuList}>
                    {items.map((item, index) => (
                        <div key={index} className={styles.skuCard} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 0.8fr auto', gap: '1rem', alignItems: 'end', padding: '1.25rem' }}>
                            {/* Product Select */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Product</label>
                                <select
                                    className={styles.select}
                                    value={item.product_id}
                                    onChange={e => updateItem(index, 'product_id', e.target.value)}
                                    required
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Variant Select */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Variant</label>
                                <select
                                    className={styles.select}
                                    value={item.sku_id}
                                    onChange={e => updateItem(index, 'sku_id', e.target.value)}
                                    disabled={!item.product_id}
                                    required
                                >
                                    <option value="">Select Variant...</option>
                                    {products.find(p => p.id === item.product_id)?.skus.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.weight_label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={styles.input}
                                    value={item.quantity}
                                    onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                                    required
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Price/Unit</label>
                                <input
                                    className={styles.input}
                                    value={formatPrice(item.price_per_unit)}
                                    readOnly
                                    style={{ background: 'var(--background)', opacity: 0.7 }}
                                />
                            </div>

                            {/* Total Line Item */}
                            <div style={{ textAlign: 'right', fontWeight: 'bold', paddingBottom: '0.6rem', color: 'var(--color-primary-dark)' }}>
                                {formatPrice(item.price_per_unit * item.quantity)}
                            </div>

                            {/* Delete */}
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className={styles.deleteSkuBtn}
                                    style={{ paddingBottom: '0.6rem' }}
                                    title="Remove Item"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Totals Section */}
                <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '320px', fontSize: '1.4rem', fontWeight: '800' }}>
                        <span>Order Total:</span>
                        <span style={{ color: 'var(--color-primary-dark)' }}>{formatPrice(totalOrderValue)}</span>
                    </div>

                    {/* Payment Info */}
                    <div style={{ width: '320px', marginTop: '1rem' }}>
                        <div className={styles.inputGroup}>
                            <label>Amount Received</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={amountReceived}
                                onChange={e => setAmountReceived(Number(e.target.value))}
                                style={{ fontSize: '1.1rem', fontWeight: '700' }}
                            />
                        </div>
                    </div>
                    <div style={{ width: '320px' }}>
                        <div className={styles.inputGroup}>
                            <label>Payment Status</label>
                            <select
                                className={styles.select}
                                value={paymentStatus}
                                onChange={e => setPaymentStatus(e.target.value)}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '2.5rem' }}>
                    <label>Comments & Internal Notes</label>
                    <textarea
                        className={styles.textarea}
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        placeholder="Additional notes about this order..."
                        rows={3}
                    />
                </div>
            </div>
        </form>
    )
}
