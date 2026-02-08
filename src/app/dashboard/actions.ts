
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getDashboardStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Check Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'DISTRIBUTOR'

    if (role === 'ADMIN') {
        return getAdminStats(supabase)
    } else if (role === 'REFERRER') {
        // For referrers, we might just redirect them to their specific view, 
        // or return stats here if we unify the dashboard page.
        // Let's redirect for cleaner separation.
        // Note: Calling redirect inside a server action that populates a component might be tricky if component expects data.
        // But since this is called by the Page component, we can return a flag or redirect.
        // Actually, we can just return stats tailored for Referrer.
        return { role: 'REFERRER', stats: [], recentSales: [] } // The Page component will handle or we just add the UI there?
        // Better: The `DashboardPage` component should render `ReferrerDashboard` if role is Referrer.
        // But `ReferrerDashboard` is a page...
        // Let's keep it simple: generic dashboard shows basic info, or redirection happens at middleware/layout.
    } else {
        return getDistributorStats(supabase, user.id)
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

async function getAdminStats(supabase: any) {
    // 1. Fetch Basic Counts
    const { count: distributorsCount } = await supabase.from('distributors').select('*', { count: 'exact', head: true })
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
    const { count: referrersCount } = await supabase.from('referrers').select('*', { count: 'exact', head: true })

    // 2. Fetch Distributors
    const { data: distributors } = await supabase
        .from('distributors')
        .select('id, name')

    // 3. Fetch Inventory Events (for Stock Counts)
    const { data: inventoryEvents } = await supabase
        .from('inventory_events')
        .select('distributor_id, type, quantity')

    // Aggregate Stock per Distributor
    const distributorStockMap: Record<string, number> = {}
    inventoryEvents?.forEach((e: any) => {
        const qty = Number(e.quantity)
        if (!distributorStockMap[e.distributor_id]) distributorStockMap[e.distributor_id] = 0

        if (e.type === 'IN' || e.type === 'OPENING' || e.type === 'RETURN') {
            distributorStockMap[e.distributor_id] += qty
        } else if (e.type === 'SENT' || e.type === 'SOLD') {
            distributorStockMap[e.distributor_id] -= qty
        }
    })

    // 4. Fetch Pricing (for Commission/Profit Calc)
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

    // 5. Fetch Sales (for Profit, Sales, Channels)
    const { data: sales } = await supabase
        .from('sales')
        .select(`
            distributor_id,
            total_amount,
            quantity,
            sales_channel,
            sku_id,
            supermarket_id,
            skus ( vendor_cost:calculated_vendor_cost, packing_cost, weight_grams )
        `)

    // Aggregate Sales & Profit per Distributor
    const distributorSalesMap: Record<string, number> = {}
    const distributorProfitMap: Record<string, number> = {}
    const channelSalesMap: Record<string, number> = {}

    sales?.forEach((sale: any) => {
        const dId = sale.distributor_id
        const saleValue = sale.total_amount || 0

        // Sales Channel Aggregation
        const channel = sale.sales_channel || 'Other'
        channelSalesMap[channel] = (channelSalesMap[channel] || 0) + saleValue

        // Distributor Sales Aggregation
        distributorSalesMap[dId] = (distributorSalesMap[dId] || 0) + saleValue

        // Profit Calculation
        // @ts-ignore
        const sku = Array.isArray(sale.skus) ? sale.skus[0] : sale.skus
        const costPerUnit = (sku?.vendor_cost || 0) + (sku?.packing_cost || 0) // Note: vendor_cost is already calculated for the weight
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

        const netRevenue = saleValue - commissionAmount
        const profit = netRevenue - totalCost

        distributorProfitMap[dId] = (distributorProfitMap[dId] || 0) + profit
    })

    // Prepare Distributor Stats List
    const distributorStats = distributors?.map((d: any) => ({
        id: d.id,
        name: d.name,
        stockCount: distributorStockMap[d.id] || 0,
        totalSales: distributorSalesMap[d.id] || 0,
        totalProfit: distributorProfitMap[d.id] || 0
    })) || []

    // Prepare Channel Stats
    const channelStats = Object.entries(channelSalesMap).map(([channel, amount]) => ({
        channel,
        amount
    }))

    return {
        role: 'ADMIN',
        stats: [
            { label: 'Active Distributors', value: distributorsCount, format: 'number' },
            { label: 'Total Products', value: productsCount, format: 'number' },
            { label: 'Referrers', value: referrersCount, format: 'number' },
        ],
        distributorOverview: distributorStats,
        channelSales: channelStats,
        recentSales: []
    }
}
