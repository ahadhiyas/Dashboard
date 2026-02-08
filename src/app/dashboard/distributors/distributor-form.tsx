
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDistributor, updateDistributor, type DistributorInput } from './actions'
import styles from '../products/product-form.module.css' // Reusing styles

type DistributorFormProps = {
    initialData?: DistributorInput & { id: string, email?: string }
}

export default function DistributorForm({ initialData }: DistributorFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<DistributorInput>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        password: '', // Always empty initially
        location: initialData?.location || '',
        contact_info: initialData?.contact_info || '',
        is_active: initialData?.is_active ?? true,
    })

    const isEditing = !!initialData?.id

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (initialData?.id) {
                await updateDistributor(initialData.id, formData)
            } else {
                await createDistributor(formData)
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>{isEditing ? 'Edit Distributor' : 'Register Distributor'}</h1>
                <div className={styles.actions}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Distributor'}
                    </button>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Account Information</h3>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Full Name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Store or Owner Name"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            required
                            disabled={isEditing} // Cannot change email solely from here easily without auth admin API complexity
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@domain.com"
                        />
                    </div>

                    {!isEditing && (
                        <div className={styles.inputGroup}>
                            <label>Initial Password</label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                minLength={6}
                            />
                            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Min 6 characters. User can reset later.</span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Operational Details</h3>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Location / Area</label>
                        <input
                            required
                            value={formData.location || ''}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            placeholder="e.g. Downtown Dubai"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Contact Info</label>
                        <input
                            value={formData.contact_info || ''}
                            onChange={e => setFormData({ ...formData, contact_info: e.target.value })}
                            placeholder="Phone number, fallback email, etc."
                        />
                    </div>
                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label>Active Account</label>
                    </div>
                </div>
            </div>
        </form>
    )
}
