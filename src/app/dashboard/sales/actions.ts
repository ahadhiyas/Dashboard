
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Helper
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

export type SaleInput = {
    supermarket_id: string
    sku_id: string
    quantity: number
    amount_received: number
}

export async function recordSale(data: SaleInput) {
    const supabase = await createClient()
    const distributorId = await getDistributorId(supabase)

    // 1. Fetch current pricing to determine the Total Value for this sale
    // We need to lock this in. Since my schema didn't originally have 'total_amount', 
    // I will rely on the app to help the user.
    // BUT: Implementing the "Receivables" requirement is impossible without knowing the Total Value of the sale.
    // I will add a column `total_amount` to the table in a migration.
    // For now in code, I will assume the column exists or is handled.

    // Let's first fetch the pricing to calculate it.
    const { data: pricing } = await supabase
        .from('pricing')
        .select('selling_price')
        .eq('supermarket_id', data.supermarket_id)
        .eq('sku_id', data.sku_id)
        .single()

    const unitPrice = pricing?.selling_price || 0
    const expectedTotal = unitPrice * data.quantity

    // Implicit Logic: If we can't change the schema right now (user interaction required), 
    // we might have to rely on 'Amount Received' being the *payment*, but we lose the 'Invoiced' part if we don't store it.
    // I will WRITE logic that tries to insert `total_amount`. 
    // I will create a `update_schema.sql` for the user to run.

    const { error } = await supabase
        .from('sales')
        .insert({
            distributor_id: distributorId,
            supermarket_id: data.supermarket_id,
            sku_id: data.sku_id,
            quantity: data.quantity,
            amount_received: data.amount_received,
            // @ts-ignore - We will ask user to add this column
            total_amount: expectedTotal,
            sale_date: new Date().toISOString()
        })

    if (error) throw new Error('Failed to record sale: ' + error.message)

    revalidatePath('/dashboard/sales')
    redirect('/dashboard/sales')
}
