
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type SupermarketInput = {
    name: string
    area?: string
    location?: string
    contact_person?: string
    phone_no?: string
    type?: 'Chain' | 'Batch'
    comments?: string
    distributor_id?: string // For admin use
}

async function getDistributorId(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role === 'ADMIN') {
        return null // Admins can specify distributor_id
    }

    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!distributor) throw new Error('Distributor profile not found for this user')
    return distributor.id
}

export async function createSupermarket(data: SupermarketInput) {
    const supabase = await createClient()

    // For admins, data.distributor_id should be provided. 
    // For distributors, we ignore data.distributor_id and fetch their own ID.
    let distributorId = data.distributor_id

    // If not provided (or we want to enforce security), get from auth
    if (!distributorId) {
        distributorId = await getDistributorId(supabase)
    } else {
        // If provided, ensure user is ADMIN. 
        // getDistributorId returns null for ADMIN, so we can check that way or redundant check
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (profile?.role !== 'ADMIN') {
                // Force override for non-admins
                distributorId = await getDistributorId(supabase)
            }
        }
    }

    if (!distributorId) throw new Error('Distributor ID is required')

    const { error } = await supabase
        .from('supermarkets')
        .insert({
            distributor_id: data.distributor_id || distributorId,
            name: data.name,
            area: data.area,
            location: data.location,
            contact_person: data.contact_person,
            phone_no: data.phone_no,
            type: data.type,
            comments: data.comments
        })

    if (error) throw new Error('Failed to create supermarket: ' + error.message)

    revalidatePath('/dashboard/supermarkets')
    redirect('/dashboard/supermarkets')
}

export async function updateSupermarket(id: string, data: SupermarketInput) {
    const supabase = await createClient()

    // Check if Admin to allow updating distributor_id
    const { data: { user } } = await supabase.auth.getUser()
    let isAdmin = false
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        isAdmin = profile?.role === 'ADMIN'
    }

    const payload: any = {
        name: data.name,
        area: data.area,
        location: data.location,
        contact_person: data.contact_person,
        phone_no: data.phone_no,
        type: data.type,
        comments: data.comments
    }

    const { error } = await supabase
        .from('supermarkets')
        .update(payload)
        .eq('id', id)

    if (error) throw new Error('Failed to update supermarket: ' + error.message)

    revalidatePath('/dashboard/supermarkets')
    redirect('/dashboard/supermarkets')
}

export async function deleteSupermarket(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('supermarkets').delete().eq('id', id)
    if (error) throw new Error('Failed to delete supermarket')
    revalidatePath('/dashboard/supermarkets')
}
