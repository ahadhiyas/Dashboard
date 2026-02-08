
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
    const distributorId = await getDistributorId(supabase)

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

    // RLS protects us here, but good to be safe - standard update
    const { error } = await supabase
        .from('supermarkets')
        .update({
            name: data.name,
            area: data.area,
            location: data.location,
            contact_person: data.contact_person,
            phone_no: data.phone_no,
            type: data.type,
            comments: data.comments
        })
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
