
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Helper (Duplicated again, would be utils in real refactor)
async function getDistributorId(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!distributor) throw new Error('Distributor profile not found')
    return distributor.id
}

export type ShipmentInput = {
    supermarket_id: string
    sku_id: string
    quantity: number
}

export async function createShipment(data: ShipmentInput) {
    const supabase = await createClient()
    const distributorId = await getDistributorId(supabase)

    // 1. Create Inventory Event (Type: SENT)
    // Note: We might want to store 'supermarket_id' in metadata or a separate column if we want to track WHERE it went exacty.
    // The current schema `inventory_events` doesn't have `supermarket_id`.
    // For now, checks requirement: "Distributor records shipment events... System auto-reduces inventory". 
    // It effectively just reduces stock. Tracking "Stock at Supermarket" would require a new schema element or interpreting 'sales' vs 'shipments'.
    // We will trust the Sales module to hande the "Sold" part.

    const { error } = await supabase
        .from('inventory_events')
        .insert({
            distributor_id: distributorId,
            sku_id: data.sku_id,
            type: 'SENT',
            quantity: data.quantity, // Stored as positive, logic handles sign
            event_date: new Date().toISOString()
        })

    if (error) throw new Error('Failed to record shipment: ' + error.message)

    revalidatePath('/dashboard/shipments')
    redirect('/dashboard/shipments')
}
