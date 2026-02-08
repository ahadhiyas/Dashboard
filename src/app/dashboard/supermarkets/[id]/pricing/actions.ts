
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type PricingInput = {
    supermarket_id: string
    sku_id: string
    selling_price: number
    commission_type: 'PERCENTAGE' | 'FLAT'
    commission_value: number
}

export async function savePricing(supermarketId: string, pricingData: PricingInput[]) {
    const supabase = await createClient()

    // RLS check: Upserting into pricing requires us to be the distributor owning the supermarket.
    // The policy defined in schema.sql handles this:
    // "Distributors can manage their supermarket pricing" ... using exists(supermarkets -> distributor -> profile = uid)

    const { error } = await supabase
        .from('pricing')
        .upsert(pricingData, { onConflict: 'supermarket_id, sku_id' })

    if (error) throw new Error('Failed to save pricing: ' + error.message)

    revalidatePath(`/dashboard/supermarkets/${supermarketId}/pricing`)
    // We stay on the page to let them continue editing
}
