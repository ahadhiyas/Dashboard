
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type InventoryItem = {
    sku_id: string
    product_name: string
    weight_label: string
    stock: number
}

// Helper to get distributor ID (duplicated from other actions, should refactor in real app)
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

export async function addIncomingStock(skuId: string, quantity: number) {
    const supabase = await createClient()
    const distributorId = await getDistributorId(supabase)

    const { error } = await supabase
        .from('inventory_events')
        .insert({
            distributor_id: distributorId,
            sku_id: skuId,
            type: 'IN',
            quantity: quantity,
            event_date: new Date().toISOString()
        })

    if (error) throw new Error('Failed to add stock: ' + error.message)
    revalidatePath('/dashboard/my-inventory')
}

// Fetch Inventory for Current Distributor
export async function getMyInventory() {
    const supabase = await createClient()
    const distributorId = await getDistributorId(supabase)

    // Fetch all events for this distributor
    const { data: events } = await supabase
        .from('inventory_events')
        .select('sku_id, type, quantity')
        .eq('distributor_id', distributorId)

    // Fetch product info
    const { data: skus } = await supabase
        .from('skus')
        .select('id, weight_label, products(name)')

    if (!events || !skus) return []

    // Aggregate
    const stockMap: Record<string, number> = {}

    events.forEach((e: any) => {
        const qty = Number(e.quantity)
        if (!stockMap[e.sku_id]) stockMap[e.sku_id] = 0

        if (e.type === 'IN' || e.type === 'OPENING' || e.type === 'RETURN') {
            stockMap[e.sku_id] += qty
        } else if (e.type === 'SENT' || e.type === 'SOLD') {
            stockMap[e.sku_id] -= qty
        }
    })

    // Format result
    return skus.map((sku: any) => ({
        sku_id: sku.id,
        product_name: sku.products?.name,
        weight_label: sku.weight_label,
        stock: stockMap[sku.id] || 0
    }))
}

// Admin: Fetch Global Inventory
export async function getGlobalInventory() {
    const supabase = await createClient()

    // Fetch all events
    const { data: events } = await supabase
        .from('inventory_events')
        .select('distributor_id, sku_id, type, quantity, distributors(name)')

    const { data: skus } = await supabase
        .from('skus')
        .select('id, weight_label, products(name)')

    if (!events || !skus) return []

    // Aggregate by Distributor + SKU
    // Map: `${distributor_id}_${sku_id}` -> quantity
    const stockMap: Record<string, number> = {}
    const distributorsMap: Record<string, string> = {} // id -> name

    events.forEach((e: any) => {
        const key = `${e.distributor_id}_${e.sku_id}`
        distributorsMap[e.distributor_id] = e.distributors?.name

        const qty = Number(e.quantity)
        if (!stockMap[key]) stockMap[key] = 0

        if (e.type === 'IN' || e.type === 'OPENING' || e.type === 'RETURN') {
            stockMap[key] += qty
        } else if (e.type === 'SENT' || e.type === 'SOLD') {
            stockMap[key] -= qty
        }
    })

    // Result: List of { distributor, product, variant, stock }
    const result = []
    for (const key in stockMap) {
        const [distId, skuId] = key.split('_')
        const sku = skus.find((s: any) => s.id === skuId)
        if (sku && stockMap[key] !== 0) { // Only show non-zero stock? Or allow negative/zero?
            result.push({
                distributor_id: distId,
                distributor_name: distributorsMap[distId],
                sku_id: skuId,
                // @ts-ignore
                product_name: Array.isArray(sku.products) ? sku.products[0]?.name : sku.products?.name,
                weight_label: sku.weight_label,
                stock: stockMap[key]
            })
        }
    }

    return result
}

// Admin: Update stock for a specific distributor and SKU
export async function updateDistributorStock(distributorId: string, skuId: string, targetStock: number) {
    const supabase = await createClient()

    // Calculate current stock for this distributor + SKU
    const { data: events } = await supabase
        .from('inventory_events')
        .select('type, quantity')
        .eq('distributor_id', distributorId)
        .eq('sku_id', skuId)

    let currentStock = 0
    events?.forEach((e: any) => {
        const qty = Number(e.quantity)
        if (e.type === 'IN' || e.type === 'OPENING' || e.type === 'RETURN') {
            currentStock += qty
        } else if (e.type === 'SENT' || e.type === 'SOLD') {
            currentStock -= qty
        }
    })

    // Calculate difference
    const difference = targetStock - currentStock

    if (difference === 0) {
        // No change needed
        return
    }

    // Create appropriate inventory event
    const eventType = difference > 0 ? 'IN' : 'SOLD'
    const quantity = Math.abs(difference)

    const { error } = await supabase
        .from('inventory_events')
        .insert({
            distributor_id: distributorId,
            sku_id: skuId,
            type: eventType,
            quantity: quantity,
            event_date: new Date().toISOString()
        })

    if (error) throw new Error('Failed to update stock: ' + error.message)

    revalidatePath('/dashboard/inventory-global')
}

// Admin: Add inventory delivery to a distributor
export type DeliveryItem = {
    sku_id: string
    quantity: number
}

export async function addInventoryDelivery(distributorId: string, items: DeliveryItem[]) {
    const supabase = await createClient()

    if (!items || items.length === 0) {
        throw new Error('No items in delivery')
    }

    // Create inventory events for each item
    const events = items.map(item => ({
        distributor_id: distributorId,
        sku_id: item.sku_id,
        type: 'IN' as const,
        quantity: item.quantity,
        event_date: new Date().toISOString()
    }))

    const { error } = await supabase
        .from('inventory_events')
        .insert(events)

    if (error) throw new Error('Failed to add delivery: ' + error.message)

    revalidatePath('/dashboard/inventory-global')
}
