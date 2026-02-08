
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReferrer, type ReferrerInput } from './actions'
import styles from '../products/product-form.module.css'

export default function ReferrerForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<ReferrerInput>({
        name: '', email: '', password: '', phone: '', commission_percentage: 5
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await createReferrer(formData)
        } catch (err: any) {
            alert(err.message)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>New Referrer</h1>
            </div>

            <div className={styles.section}>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label>Full Name</label>
                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Email</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Password</label>
                        <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Phone</label>
                        <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Commission Share (%)</label>
                        <input type="number" required value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: Number(e.target.value) })} />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Save Referrer' : 'Save Referrer'}
                    </button>
                </div>
            </div>
        </form>
    )
}
