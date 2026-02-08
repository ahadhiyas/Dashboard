
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupermarket, updateSupermarket, type SupermarketInput } from './actions'
import styles from '../products/product-form.module.css' // Reusing styles

type SupermarketFormProps = {
    initialData?: SupermarketInput & { id: string }
}

export default function SupermarketForm({ initialData }: SupermarketFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<SupermarketInput>({
        name: initialData?.name || '',
        area: initialData?.area || '',
        location: initialData?.location || '',
        contact_person: initialData?.contact_person || '',
        phone_no: initialData?.phone_no || '',
        type: initialData?.type || undefined,
        comments: initialData?.comments || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (initialData?.id) {
                await updateSupermarket(initialData.id, formData)
            } else {
                await createSupermarket(formData)
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>{initialData ? 'Edit Supermarket' : 'New Supermarket'}</h1>
                <div className={styles.actions}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Supermarket'}
                    </button>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Details</h3>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Supermarket Name *</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Al Maya Supermarket"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Area</label>
                        <input
                            value={formData.area || ''}
                            onChange={e => setFormData({ ...formData, area: e.target.value })}
                            placeholder="e.g. Bur Dubai, Al Karama"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Location</label>
                        <input
                            value={formData.location || ''}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Street address or landmark"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Contact Person</label>
                        <input
                            value={formData.contact_person || ''}
                            onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                            placeholder="Manager Name"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Phone No.</label>
                        <input
                            type="tel"
                            value={formData.phone_no || ''}
                            onChange={e => setFormData({ ...formData, phone_no: e.target.value })}
                            placeholder="+971 XX XXX XXXX"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Type</label>
                        <select
                            value={formData.type || ''}
                            onChange={e => setFormData({ ...formData, type: e.target.value as 'Chain' | 'Batch' | undefined })}
                        >
                            <option value="">-- Select Type --</option>
                            <option value="Chain">Chain</option>
                            <option value="Batch">Batch</option>
                        </select>
                    </div>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                    <label>Comments</label>
                    <textarea
                        value={formData.comments || ''}
                        onChange={e => setFormData({ ...formData, comments: e.target.value })}
                        placeholder="Additional notes or remarks"
                        rows={4}
                        style={{ width: '100%', resize: 'vertical' }}
                    />
                </div>
            </div>
        </form>
    )
}
