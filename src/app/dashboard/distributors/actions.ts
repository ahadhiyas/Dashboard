
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type DistributorInput = {
    name: string
    email: string
    password?: string
    location?: string
    contact_info?: string
    is_active: boolean
}

export async function createDistributor(data: DistributorInput) {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Check if user already exists
    // In a real app we might want to handle this gracefully, but createUser throws if email exists

    if (!data.password) throw new Error("Password is required for new distributors")

    // 2. Create Auth User (Admin API)
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name } // This triggers the handle_new_user SQL trigger
    })

    if (userError) throw new Error('Failed to create user: ' + userError.message)

    // 3. The SQL Trigger (handle_new_user) automatically creates a 'profiles' entry with role 'DISTRIBUTOR'.
    // However, we also need to create the 'distributors' entity linked to that profile.
    // Wait a moment for trigger or just insert directly? 
    // Better: We insert into 'distributors' table linking to the new user ID.

    const userId = userData.user.id

    const { error: distError } = await supabase
        .from('distributors')
        .insert({
            profile_id: userId,
            name: data.name,
            location: data.location,
            contact_info: data.contact_info,
            is_active: data.is_active
        })

    if (distError) {
        // Cleanup user if distributor creation fails
        await adminClient.auth.admin.deleteUser(userId)
        throw new Error('Failed to create distributor profile: ' + distError.message)
    }

    revalidatePath('/dashboard/distributors')
    redirect('/dashboard/distributors')
}

export async function updateDistributor(distributorId: string, data: DistributorInput) {
    const supabase = await createClient()

    // Update Distributor Details
    const { error } = await supabase
        .from('distributors')
        .update({
            name: data.name,
            location: data.location,
            contact_info: data.contact_info,
            is_active: data.is_active
        })
        .eq('id', distributorId)

    if (error) throw new Error('Failed to update distributor: ' + error.message)

    // Note: We are not updating email/password here. That should be a separate "Reset Password" flow if needed.

    revalidatePath('/dashboard/distributors')
    redirect('/dashboard/distributors')
}

export async function deleteDistributor(distributorId: string) {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get the profile_id before deleting
    const { data: distributor } = await supabase
        .from('distributors')
        .select('profile_id')
        .eq('id', distributorId)
        .single()

    if (!distributor) {
        throw new Error('Distributor not found')
    }

    // Delete distributor record (will cascade to related data)
    const { error: distError } = await supabase
        .from('distributors')
        .delete()
        .eq('id', distributorId)

    if (distError) {
        throw new Error('Failed to delete distributor: ' + distError.message)
    }

    // Delete the auth user if they have a profile_id
    if (distributor.profile_id) {
        const { error: userError } = await adminClient.auth.admin.deleteUser(distributor.profile_id)
        if (userError) {
            console.error('Failed to delete auth user:', userError.message)
            // Don't throw here - distributor is already deleted
        }
    }

    revalidatePath('/dashboard/distributors')
}
