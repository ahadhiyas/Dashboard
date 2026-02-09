'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getDashboardStats(searchParams?: { from?: string, to?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Date Filter Logic
    const now = new Date()
    // Default to this month if not specified
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString() // End of month

    const dateFrom = searchParams?.from ? new Date(searchParams.from).toISOString() : defaultFrom
    const dateTo = searchParams?.to ? new Date(searchParams.to).toISOString() : defaultTo

    // Fetch Profile
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role

    // Base Response Structure
    let stats = []
    let recentActivity = []
    let distributorOverview = [] // For Admin
    let channelSales = [] // For Admin

    if (role === 'DISTRIBUTOR') {
        const { data: distributor } = await supabase
            .from('distributors')
            .select('id')
            .eq('profile_id', user.id)
            .single()

        if (distributor) {
            // 1. Fetch Orders in Date Range
            const { data: orders } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        quantity,
                        price_per_unit,
                        skus (
                            calculated_vendor_cost
                        )
                    )
                `)
                .eq('distributor_id', distributor.id)
                .gte('order_date', dateFrom)
                .lte('order_date', dateTo)
                .order('order_date', { ascending: false })

            // 2. Calculate Stats
            let totalSales = 0
            let totalCost = 0
            let totalReceived = 0

            orders?.forEach((order: any) => {
                totalSales += order.total_amount || 0
                totalReceived += order.amount_received || 0

                // Calculate Cost for Profit
                order.order_items?.forEach((item: any) => {
                    // Vendor Cost * Quantity
                    const cost = (item.skus?.calculated_vendor_cost || 0) * item.quantity
                    totalCost += cost
                })
            })

            const totalProfit = totalSales - totalCost
            const outstanding = totalSales - totalReceived
            const collectionRate = totalSales > 0 ? (totalReceived / totalSales) * 100 : 0

            stats = [
                { label: 'Total Sales', value: totalSales, format: 'currency' },
                { label: 'Total Profit', value: totalProfit, format: 'currency', alert: totalProfit < 0 }, // Profit might be negative if costs > sales? Unlikely but possible with weird data
                { label: 'Outstanding', value: outstanding, format: 'currency', alert: outstanding > 0 }, // Outstanding is "Bad" if high, but alert logic depends on context.
                { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, alert: collectionRate < 50 } // Alert if < 50%
            ]

            // 3. Recent Activity (Last 5 orders)
            // Re-fetch or slice? slice is fine if we fetched enough. 
            // We fetched ALL in range. If range is huge, this might be heavy.
            // But for a dashboard, date range usually limits it.
            // If we want GLOBAL recent activity regardless of date filter, we should do a separate query.
            // Requirement: "log the recent activity - sales records ( last 5 )"
            // Usually this means "What just happened". I will fetch the absolute last 5 independently.

            const { data: recent } = await supabase
                .from('orders')
                .select('id, order_date, total_amount, amount_received, sales_channel, customer_name, supermarkets(name), order_items(skus(products(name), weight_label))')
                .eq('distributor_id', distributor.id)
                .order('order_date', { ascending: false })
                .limit(5)

            recentActivity = recent || []
        }
    } else if (role === 'ADMIN') {
        const adminStats = await getAdminStats(supabase, dateFrom, dateTo)
        return adminStats
    }

    return {
        role,
        stats,
        recentSales: recentActivity,
        distributorOverview, // Keep for admin if we didn't touch it
        channelSales // Keep for admin
    }
}

// ... rest of the file ...
// (We just prepend the redirect logic or handle it in the Page)
async function getDistributorStats(supabase: any, userId: string) {
    // ... existing logic ...
    // (Pasted previous content to ensure file integrity)
    // 1. Get Distributor ID
    const { data: dist } = await supabase
        .from('distributors')
        .select('id')
        .eq('profile_id', userId)
        .single()

    if (!dist) return null

    // 2. Fetch Pricing Map for this Distributor's Supermarkets
    const { data: pricingData } = await supabase
        .from('pricing')
        .select('supermarket_id, sku_id, commission_type, commission_value')

    const pricingMap: Record<string, { type: string, value: number }> = {}
    pricingData?.forEach((p: any) => {
        pricingMap[`${p.supermarket_id}_${p.sku_id}`] = {
            type: p.commission_type,
            value: p.commission_value
        }
    })

    // 3. Fetch Sales with Cost Info
    const { data: sales } = await supabase
        .from('sales')
        .select(`
      quantity, 
      amount_received, 
      total_amount, 
      sale_date,
      sku_id,
      supermarket_id,
      skus ( vendor_cost, packing_cost, weight )
    `)
        .eq('distributor_id', dist.id)

    let totalSales = 0
    let totalReceived = 0
    let totalProfit = 0
    let totalReceivables = 0

    sales?.forEach((sale: any) => {
        // A. Sales Value
        const saleValue = sale.total_amount || 0
        totalSales += saleValue
        totalReceived += sale.amount_received || 0

        // B. Receivables
        totalReceivables += (saleValue - (sale.amount_received || 0))

        // C. Profit Calculation
        // Cost
        // @ts-ignore
        const sku = Array.isArray(sale.skus) ? sale.skus[0] : sale.skus

        const costPerKg = sku?.vendor_cost || 0
        const weight = sku?.weight || 0
        const packingCost = sku?.packing_cost || 0

        const costPerUnit = (costPerKg / 1000 * weight) + packingCost
        const totalCost = costPerUnit * sale.quantity

        // Commission
        const pKey = `${sale.supermarket_id}_${sale.sku_id}`
        const pricing = pricingMap[pKey]

        let commissionAmount = 0
        if (pricing) {
            if (pricing.type === 'PERCENTAGE') {
                commissionAmount = saleValue * (pricing.value / 100)
            } else {
                commissionAmount = pricing.value * sale.quantity
            }
        }

        // Net Revenue = Sale Value - Commission
        const netRevenue = saleValue - commissionAmount

        // Profit = Net Revenue - Total Cost
        totalProfit += (netRevenue - totalCost)
    })

    // Recent Sales
    const { data: recentSales } = await supabase
        .from('sales')
        .select('*, supermarkets(name), skus(weight_label, products(name))')
        .eq('distributor_id', dist.id)
        .order('sale_date', { ascending: false })
        .limit(5)

    return {
        role: 'DISTRIBUTOR',
        stats: [
            { label: 'Total Sales', value: totalSales, format: 'currency' },
            { label: 'Total Profit', value: totalProfit, format: 'currency' },
            { label: 'Outstanding', value: totalReceivables, format: 'currency', alert: totalReceivables > 1000 },
            { label: 'Collection Rate', value: totalSales > 0 ? ((totalReceived / totalSales) * 100).toFixed(1) + '%' : '0%' }
        ],
        recentSales
    }
}

async function getAdminStats(supabase: any, from: string, to: string) {
    const { count: distributorsCount } = await supabase.from('distributors').select('*', { count: 'exact', head: true })
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
    const { count: referrersCount } = await supabase.from('referrers').select('*', { count: 'exact', head: true })

    // 1. Fetch Orders with Items for Calculations
    const { data: allOrders } = await supabase
        .from('orders')
        .select(`
            *,
            distributors(id, name),
            supermarkets(id, name),
            order_items(
                quantity,
                price_per_unit,
                skus(
                    product_id,
                    products(name),
                    calculated_vendor_cost,
                    packing_cost,
                    weight_grams
                )
            )
        `)
        .eq('status', 'COMPLETED')
        .gte('order_date', from)
        .lte('order_date', to)

    // 2. Metrics Calculation
    let totalSales = 0
    let totalProfit = 0
    let totalOrders = 0

    const distributorSales: Record<string, { name: string, sales: number, profit: number, orders: number }> = {}
    const supermarketSales: Record<string, { name: string, sales: number, orders: number }> = {}
    const productSales: Record<string, { name: string, quantity: number, sales: number }> = {}

    allOrders?.forEach((order: any) => {
        const orderTotal = order.total_amount || 0
        totalSales += orderTotal
        totalOrders += 1

        let orderCost = 0

        // Process Items
        order.order_items?.forEach((item: any) => {
            const sku = item.skus
            // Cost = (Vendor Cost + Packing) * Qty
            // Note: calculated_vendor_cost in SKU likely includes weight calc?
            // "calculated_vendor_cost: number // Auto-calculated from product vendor_cost_per_kg"
            // Let's assume calculated_vendor_cost is the cost per unit.
            const costPerUnit = (sku?.calculated_vendor_cost || 0) + (sku?.packing_cost || 0)
            orderCost += costPerUnit * item.quantity

            // Product Stats
            const prodName = sku?.products?.name || 'Unknown'
            const prodId = sku?.product_id
            if (prodId) {
                if (!productSales[prodId]) productSales[prodId] = { name: prodName, quantity: 0, sales: 0 }
                productSales[prodId].quantity += item.quantity
                productSales[prodId].sales += (item.price_per_unit * item.quantity)
            }
        })

        const orderProfit = orderTotal - orderCost
        totalProfit += orderProfit

        // Distributor Stats
        const dId = order.distributor_id
        const dName = order.distributors?.name || 'Unknown'
        if (!distributorSales[dId]) distributorSales[dId] = { name: dName, sales: 0, profit: 0, orders: 0 }
        distributorSales[dId].sales += orderTotal
        distributorSales[dId].profit += orderProfit
        distributorSales[dId].orders += 1

        // Supermarket Stats
        const sId = order.supermarket_id
        if (sId) {
            const sName = order.supermarkets?.name || 'Unknown'
            if (!supermarketSales[sId]) supermarketSales[sId] = { name: sName, sales: 0, orders: 0 }
            supermarketSales[sId].sales += orderTotal
            supermarketSales[sId].orders += 1
        }
    })

    // 3. Inventory Stock (Global)
    // We need current stock. Inventory Events approach:
    const { data: inventoryEvents } = await supabase
        .from('inventory_events')
        .select('quantity, type, sku_id, skus(products(name))')

    const stockMap: Record<string, { name: string, count: number }> = {}
    inventoryEvents?.forEach((e: any) => {
        const flow = (e.type === 'IN' || e.type === 'OPENING' || e.type === 'RETURN') ? 1 : -1
        const qty = e.quantity * flow
        const skuId = e.sku_id
        const prodName = e.skus?.products?.name || 'Unknown'

        if (!stockMap[skuId]) stockMap[skuId] = { name: prodName, count: 0 }
        stockMap[skuId].count += qty
    })

    // Sort Top Performers
    const topDistributors = Object.values(distributorSales).sort((a, b) => b.sales - a.sales).slice(0, 5)
    const topSupermarkets = Object.values(supermarketSales).sort((a, b) => b.sales - a.sales).slice(0, 5)
    // Product sales by quantity or value? Requirement says "sales by products". Usually Value.
    const topProducts = Object.values(productSales).sort((a, b) => b.sales - a.sales).slice(0, 5)
    const maxProductSales = topProducts.length > 0 ? topProducts[0].sales : 0

    // Low Stock Items (Arbitrary threshold < 50?)
    const lowStock = Object.values(stockMap).filter(s => s.count < 50).sort((a, b) => a.count - b.count).slice(0, 5)

    return {
        role: 'ADMIN',
        stats: [
            { label: 'Total Revenue', value: totalSales, format: 'currency' },
            { label: 'Total Profit', value: totalProfit, format: 'currency', alert: totalProfit < 0 },
            { label: 'Total Orders', value: totalOrders, format: 'number' },
            { label: 'Active Distributors', value: distributorsCount, format: 'number' },
        ],
        topDistributors,
        topSupermarkets,
        topProducts,
        maxProductSales,
        inventorySummary: {
            lowStock
        },
        distributorOverview: Object.values(distributorSales), // Full list for table
        // channelSales: ... we can add channel breakdown if needed, similar logic
    }
}
