import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import styles from './dashboard.module.css'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch Profile for Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'DISTRIBUTOR'

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.logoArea}>
                    <div style={{ padding: '0.5rem 0' }}>
                        <NextImage
                            src="/logo.png"
                            alt="Ahadhiyas"
                            width={160}
                            height={60}
                            style={{ width: '100%', height: 'auto', maxWidth: '180px' }}
                            priority
                        />
                    </div>
                    <span className={styles.roleLabel}>{role}</span>
                </div>

                <nav className={styles.nav}>
                    <Link href="/dashboard" className={styles.navItem}>
                        Dashboard
                    </Link>

                    {role === 'ADMIN' && (
                        <>
                            <div className={styles.navSection}>Admin</div>
                            <Link href="/dashboard/products" className={styles.navItem}>Products</Link>
                            <Link href="/dashboard/distributors" className={styles.navItem}>Distributors</Link>
                            <Link href="/dashboard/inventory-global" className={styles.navItem}>Global Inventory</Link>
                        </>
                    )}

                    {role === 'DISTRIBUTOR' && (
                        <>
                            <div className={styles.navSection}>Manage</div>
                            <Link href="/dashboard/my-inventory" className={styles.navItem}>My Inventory</Link>
                            <Link href="/dashboard/supermarkets" className={styles.navItem}>Supermarkets</Link>
                            <Link href="/dashboard/sales" className={styles.navItem}>Sales</Link>
                            <Link href="/dashboard/shipments" className={styles.navItem}>Shipments</Link>
                        </>
                    )}
                </nav>

                <div className={styles.userArea}>
                    <div className={styles.userEmail}>{user.email}</div>
                    <form action="/auth/signout" method="post">
                        <button className={styles.logoutBtn} type="submit">Sign Out</button>
                    </form>
                </div>
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    )
}
