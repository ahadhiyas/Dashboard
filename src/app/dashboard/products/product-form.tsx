
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct, updateProduct, type ProductInput, type SKUInput } from './actions'
import styles from './product-form.module.css'

type ProductFormProps = {
    initialData?: ProductInput & { id: string }
}

const emptySku: SKUInput = {
    weight_label: '',
    weight_grams: 0,
    calculated_vendor_cost: 0,
    basic_price: 0,
    packing_cost: 0,
    min_selling_price: 0,
    ahadhiyas_price: 0,
    mrp: 0
}

export default function ProductForm({ initialData }: ProductFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<ProductInput>({
        name: initialData?.name || '',
        category: initialData?.category || '',
        description: initialData?.description || '',
        is_active: initialData?.is_active ?? true,
        vendor_cost_per_kg: initialData?.vendor_cost_per_kg || 0,
        cgst_percent: initialData?.cgst_percent || 0,
        sgst_percent: initialData?.sgst_percent || 0,
        skus: initialData?.skus || [{ ...emptySku }]
    })

    // Auto-calculate vendor cost and min selling price for each SKU
    const calculateSku = (sku: SKUInput, vendorCostPerKg: number): SKUInput => {
        // Calculate vendor cost based on weight
        const calculatedVendorCost = (vendorCostPerKg / 1000) * sku.weight_grams

        // Calculate min selling price: (basic_price * 1.18) + packing_cost
        const minSellingPrice = (sku.basic_price * 1.18) + sku.packing_cost

        return {
            ...sku,
            calculated_vendor_cost: Number(calculatedVendorCost.toFixed(2)),
            min_selling_price: Number(minSellingPrice.toFixed(2))
        }
    }

    // SKU Management
    const updateSku = (index: number, field: keyof SKUInput, value: any) => {
        const newSkus = [...formData.skus]
        newSkus[index] = { ...newSkus[index], [field]: value }

        // Recalculate if weight_grams, basic_price, or packing_cost changed
        if (field === 'weight_grams' || field === 'basic_price' || field === 'packing_cost') {
            newSkus[index] = calculateSku(newSkus[index], formData.vendor_cost_per_kg)
        }

        setFormData({ ...formData, skus: newSkus })
    }

    // Recalculate all SKUs when vendor_cost_per_kg changes
    useEffect(() => {
        const recalculatedSkus = formData.skus.map(sku =>
            calculateSku(sku, formData.vendor_cost_per_kg)
        )
        setFormData(prev => ({ ...prev, skus: recalculatedSkus }))
    }, [formData.vendor_cost_per_kg])

    const addSku = () => {
        setFormData({ ...formData, skus: [...formData.skus, { ...emptySku }] })
    }

    const removeSku = (index: number) => {
        if (formData.skus.length === 1) return; // Prevent deleting the last SKU
        const newSkus = formData.skus.filter((_, i) => i !== index)
        setFormData({ ...formData, skus: newSkus })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (initialData?.id) {
                await updateProduct(initialData.id, formData)
            } else {
                await createProduct(formData)
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>{initialData ? 'Edit Product' : 'New Product'}</h1>
                <div className={styles.actions}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Basic Information</h3>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Product Name *</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Basmati Rice"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Category *</label>
                        <select
                            required
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Select a category...</option>
                            <option value="Malts">Malts</option>
                            <option value="Powders">Powders</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Soups">Soups</option>
                        </select>
                    </div>
                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>

                {/* Product-level Pricing */}
                <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                    Product Pricing
                </h4>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Vendor Cost (per KG) *</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.vendor_cost_per_kg || ''}
                            onChange={e => setFormData({ ...formData, vendor_cost_per_kg: Number(e.target.value) })}
                            placeholder="0.00"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>CGST (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.cgst_percent || ''}
                            onChange={e => setFormData({ ...formData, cgst_percent: Number(e.target.value) })}
                            placeholder="9.00"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>SGST (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.sgst_percent || ''}
                            onChange={e => setFormData({ ...formData, sgst_percent: Number(e.target.value) })}
                            placeholder="9.00"
                        />
                    </div>
                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label>Active Product</label>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>SKUs / Variants</h3>
                    <button type="button" onClick={addSku} className={styles.addButton}>+ Add Variant</button>
                </div>

                <div className={styles.skuList}>
                    {formData.skus.map((sku, index) => (
                        <div key={index} className={styles.skuCard}>
                            <div className={styles.skuHeader}>
                                <span>Variant #{index + 1}</span>
                                {formData.skus.length > 1 && (
                                    <button type="button" onClick={() => removeSku(index)} className={styles.deleteSkuBtn}>Remove</button>
                                )}
                            </div>

                            <div className={styles.grid}>
                                {/* Row 1 */}
                                <div className={styles.inputGroup}>
                                    <label>Weight Label *</label>
                                    <input
                                        required
                                        placeholder="e.g. 1kg"
                                        value={sku.weight_label}
                                        onChange={e => updateSku(index, 'weight_label', e.target.value)}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Weight (grams) *</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="1000"
                                        value={sku.weight_grams || ''}
                                        onChange={e => updateSku(index, 'weight_grams', Number(e.target.value))}
                                    />
                                </div>

                                {/* Calculated Vendor Cost - READ ONLY */}
                                <div className={styles.inputGroup}>
                                    <label>Vendor Cost (for this weight)</label>
                                    <input
                                        type="number"
                                        readOnly
                                        value={sku.calculated_vendor_cost}
                                        style={{ background: 'rgba(255, 255, 255, 0.7)', cursor: 'not-allowed', opacity: 0.8 }}
                                    />
                                </div>

                                {/* Row 2 */}
                                <div className={styles.inputGroup}>
                                    <label>Basic Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={sku.basic_price || ''}
                                        onChange={e => updateSku(index, 'basic_price', Number(e.target.value))}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Packing Cost (per unit) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={sku.packing_cost || ''}
                                        onChange={e => updateSku(index, 'packing_cost', Number(e.target.value))}
                                    />
                                </div>

                                {/* Calculated Min Selling Price - READ ONLY */}
                                <div className={styles.inputGroup}>
                                    <label>Minimum Selling Price</label>
                                    <input
                                        type="number"
                                        readOnly
                                        value={sku.min_selling_price}
                                        style={{ background: 'rgba(255, 255, 255, 0.7)', cursor: 'not-allowed', opacity: 0.8 }}
                                    />
                                    <small style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                        (Basic Price × 1.18) + Packing Cost
                                    </small>
                                </div>

                                {/* Row 3 */}
                                <div className={styles.inputGroup}>
                                    <label>Ahadhiyas Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={sku.ahadhiyas_price || ''}
                                        onChange={e => updateSku(index, 'ahadhiyas_price', Number(e.target.value))}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>MRP *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={sku.mrp || ''}
                                        onChange={e => updateSku(index, 'mrp', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </form>
    )
}
