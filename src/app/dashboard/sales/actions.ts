
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Helper to get distributor ID (reused)
async function getDistributorId(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'ADMIN') {
        // Admins might prefer to act as a specific distributor? 
        // For now, if Admin creates an order, we might need a distributor_id input.
        // But the requirement says "Distributor should be able to select...". 
        // If Admin is using this, we probably simply require distributor_id in input.
        return null
    }

    const { data: distributor } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!distributor) throw new Error('Distributor profile not found')
    return distributor.id
}

export type OrderItemInput = {
    sku_id: string
    quantity: number
    price_per_unit?: number // Optional override, otherwise fetched
}

export type OrderInput = {
    distributor_id?: string // For Admin use or explicit override
    sales_channel: 'Supermarket' | 'Whatsapp' | 'Instagram' | 'Website' | 'Other'
    customer_name?: string
    supermarket_id?: string
    comments?: string
    payment_status: 'PAID' | 'PENDING' | 'CANCELLED'
    amount_received?: number
    items: OrderItemInput[]
    order_date?: string // Optional backdating
}

async function generateOrderRef(supabase: any, distributorId: string) {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const datePrefix = `${dd}-${mm}`

    // Find count of orders created today by this distributor to append index
    // We can filter by order_ref like 'DD-MM-%'
    const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('distributor_id', distributorId)
        .ilike('order_ref', `${datePrefix}-%`)

    if (error) throw new Error('Failed to generate Order ID')

    const nextIndex = (count || 0) + 1
    return `${datePrefix}-${String(nextIndex).padStart(2, '0')}` // e.g. 08-02-01
}

export async function createOrder(data: OrderInput) {
    const supabase = await createClient()

    let distributorId = data.distributor_id
    if (!distributorId) {
        distributorId = await getDistributorId(supabase)
    }
    if (!distributorId) throw new Error('Distributor ID mismatch')

    // 1. Calculate Totals & Prepare Items
    let totalOrderAmount = 0
    const preparedItems = []

    for (const item of data.items) {
        // Fetch SKU details to get current price if not provided
        const { data: sku } = await supabase
            .from('skus')
            .select('min_selling_price, calculated_vendor_cost, packing_cost, basic_price')
            .eq('id', item.sku_id)
            .single()

        if (!sku) throw new Error(`SKU not found: ${item.sku_id}`)

        // Logic: Price is min_selling_price (which is basic*1.18 + packing)
        const pricePerUnit = item.price_per_unit || sku.min_selling_price || 0
        const totalPrice = pricePerUnit * item.quantity

        totalOrderAmount += totalPrice

        preparedItems.push({
            sku_id: item.sku_id,
            quantity: item.quantity,
            price_per_unit: pricePerUnit,
            total_price: totalPrice
        })
    }

    // 2. Generate Order Ref
    const orderRef = await generateOrderRef(supabase, distributorId)

    // 3. Insert Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            distributor_id: distributorId,
            order_ref: orderRef,
            sales_channel: data.sales_channel,
            customer_name: data.sales_channel === 'Supermarket' ? null : data.customer_name,
            supermarket_id: data.sales_channel === 'Supermarket' ? data.supermarket_id : null,
            total_amount: totalOrderAmount,
            amount_received: data.amount_received || 0,
            payment_status: data.payment_status,
            comments: data.comments,
            status: 'COMPLETED', // Default
            order_date: data.order_date || new Date().toISOString()
        })
        .select()
        .single()

    if (orderError) throw new Error('Failed to create order: ' + orderError.message)

    // 4. Insert Order Items (Sequential because we need order.id)
    const itemsToInsert = preparedItems.map(item => ({
        order_id: order.id,
        ...item
    }))

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

    if (itemsError) {
        // Cleanup order if items fail (Manual rollback simulation)
        await supabase.from('orders').delete().eq('id', order.id)
        throw new Error('Failed to create order items: ' + itemsError.message)
    }

    // 5. Update Inventory (Optional - Logging as SENT/SOLD)
    // The requirement implies this IS the log. 
    // If we want to decrement stock, we should add records to inventory_events.
    // For now, we'll assume this 'Sales Log' IS the record.
    // However, for consistency with 'Global Inventory', we might want to log events.
    // Let's Log 'SOLD' events for consistency if it's a sale.
    // Or 'SENT' if it's a shipment? 
    // Requirement says: "sales log... listed in a table" 
    // and "shipments... listed in a table". 
    // They are likely the same data but viewed differently?
    // "In Record Sale... order has to get generated"
    // "In Shipments... order has to get generated"
    // Use 'SOLD' for Sales Channel != Supermarket? And 'SENT' for Supermarket?
    // Let's stick to core order creation for now.

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/shipments')
    redirect('/dashboard/sales') // Or shipments, dependent on where called. Maybe return success and let client redirect?
    // Since this is a server action called from a form, redirect is standard. 
    // But we reuse this for shipments. We might need a flag or let client handle redirect.
    // For now, returning payload might be better than redirect if we want flexibility.
    return { success: true, orderId: order.id }
}

export async function updateOrder(id: string, data: OrderInput) {
    const supabase = await createClient()

    // 1. Recalculate Totals
    let totalOrderAmount = 0
    const preparedItems = []

    for (const item of data.items) {
        const { data: sku } = await supabase
            .from('skus')
            .select('min_selling_price')
            .eq('id', item.sku_id)
            .single()

        const pricePerUnit = item.price_per_unit || sku?.min_selling_price || 0
        const totalPrice = pricePerUnit * item.quantity
        totalOrderAmount += totalPrice

        preparedItems.push({
            sku_id: item.sku_id,
            quantity: item.quantity,
            price_per_unit: pricePerUnit,
            total_price: totalPrice
        })
    }

    // 2. Update Order Details
    const { error: orderError } = await supabase
        .from('orders')
        .update({
            sales_channel: data.sales_channel,
            customer_name: data.sales_channel === 'Supermarket' ? null : data.customer_name,
            supermarket_id: data.sales_channel === 'Supermarket' ? data.supermarket_id : null,
            total_amount: totalOrderAmount,
            amount_received: data.amount_received || 0,
            payment_status: data.payment_status,
            comments: data.comments,
            order_date: data.order_date
        })
        .eq('id', id)

    if (orderError) throw new Error('Failed to update order: ' + orderError.message)

    // 3. Update Order Items (Replace strategy: Delete all, Insert new)
    // This is simplest for preventing diffing logic issues.
    await supabase.from('order_items').delete().eq('order_id', id)

    const itemsToInsert = preparedItems.map(item => ({
        order_id: id,
        ...item
    }))

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

    if (itemsError) throw new Error('Failed to update order items: ' + itemsError.message)

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/shipments')
    return { success: true }
}

export async function deleteOrder(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw new Error('Failed to delete order')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/shipments')
}

export async function recordSale(data: {
    supermarket_id: string
    sku_id: string
    quantity: number
    amount_received: number
}) {
    return await createOrder({
        sales_channel: 'Supermarket',
        supermarket_id: data.supermarket_id,
        payment_status: 'PAID', // Default for small sales
        amount_received: data.amount_received,
        items: [{
            sku_id: data.sku_id,
            quantity: data.quantity
        }]
    })
}
