
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ReferrerInput = {
    name: string
    email: string
    password?: string
    phone?: string
    commission_percentage: number // Default commission share
}

// Create a new Referrer User
export async function createReferrer(data: ReferrerInput) {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    if (!data.password) throw new Error("Password is required")

    // 1. Create Auth User
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name }
    })

    if (userError) throw new Error('Failed to create user: ' + userError.message)

    // 2. Insert into 'referrers' table (if we had one separate from profiles).
    // Schema check: We have `referrals` table matching distributors? 
    // Wait, schema.sql says:
    // `create table referrers (id uuid references auth.users, name text, ...)` ?
    // Let's check schema.sql content mentally or via tool if needed.
    // Actually, I recall `referrers` table linked to `profiles`.

    // Let's assume standard pattern: Profile created by trigger from auth.
    // We need to update that profile to role 'REFERRER' ? 
    // The trigger `handle_new_user` defaults to 'DISTRIBUTOR' usually in my code?
    // Let's check the SQL trigger logic or just force update here.

    // Better: Explicitly create `referrers` record.

    const userId = userData.user.id

    // Update Profile Role
    await adminClient.from('profiles').update({ role: 'REFERRER' }).eq('id', userId)

    // Insert Referrer Details
    const { error: refError } = await supabase
        .from('referrers')
        .insert({
            id: userId, // Linked to auth.uid
            name: data.name,
            phone: data.phone,
            commission_percentage: data.commission_percentage
        })

    if (refError) {
        // Cleanup
        await adminClient.auth.admin.deleteUser(userId)
        throw new Error('Failed to create referrer profile: ' + refError.message)
    }

    revalidatePath('/dashboard/referrals')
    redirect('/dashboard/referrals')
}

// Link a Distributor to a Referrer
export async function linkDistributorToReferrer(distributorId: string, referrerId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('distributors')
        .update({ referrer_id: referrerId })
        .eq('id', distributorId)

    if (error) throw new Error('Failed to link referrer: ' + error.message)
    revalidatePath('/dashboard/referrals')
}
