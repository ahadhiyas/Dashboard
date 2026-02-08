
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type SKUInput = {
    id?: string
    weight_label: string
    weight_grams: number
    calculated_vendor_cost: number // Auto-calculated from product vendor_cost_per_kg
    basic_price: number
    packing_cost: number
    min_selling_price: number // Auto-calculated: (basic_price * 1.18) + packing_cost
    ahadhiyas_price: number
    mrp: number
}

export type ProductInput = {
    name: string
    category: string
    description?: string
    is_active: boolean
    vendor_cost_per_kg: number
    cgst_percent: number
    sgst_percent: number
    skus: SKUInput[]
}

export async function createProduct(data: ProductInput) {
    const supabase = await createClient()

    // 1. Create Product
    const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
            name: data.name,
            category: data.category,
            description: data.description,
            is_active: data.is_active,
            vendor_cost_per_kg: data.vendor_cost_per_kg,
            cgst_percent: data.cgst_percent,
            sgst_percent: data.sgst_percent,
        })
        .select()
        .single()

    if (productError) {
        throw new Error('Failed to create product: ' + productError.message)
    }

    // 2. Create SKUs
    if (data.skus.length > 0) {
        const skusToInsert = data.skus.map((sku) => ({
            product_id: product.id,
            weight_label: sku.weight_label,
            weight_grams: sku.weight_grams,
            calculated_vendor_cost: sku.calculated_vendor_cost,
            basic_price: sku.basic_price,
            packing_cost: sku.packing_cost,
            min_selling_price: sku.min_selling_price,
            ahadhiyas_price: sku.ahadhiyas_price,
            mrp: sku.mrp,
        }))

        const { error: skuError } = await supabase.from('skus').insert(skusToInsert)

        if (skuError) {
            // Cleanup product if SKUs fail (Manual Rollback attempt)
            await supabase.from('products').delete().eq('id', product.id)
            throw new Error('Failed to create SKUs: ' + skuError.message)
        }
    }

    revalidatePath('/dashboard/products')
    redirect('/dashboard/products')
}

export async function updateProduct(productId: string, data: ProductInput) {
    const supabase = await createClient()

    // 1. Update Product Details
    const { error: productError } = await supabase
        .from('products')
        .update({
            name: data.name,
            category: data.category,
            description: data.description,
            is_active: data.is_active,
            vendor_cost_per_kg: data.vendor_cost_per_kg,
            cgst_percent: data.cgst_percent,
            sgst_percent: data.sgst_percent,
        })
        .eq('id', productId)

    if (productError) throw new Error('Failed to update product')

    // 2. Handle SKUs (Upsert logic is complex, simpler to Delete All & Re-create or Handle diffs)
    // For simplicity in this iteration: We will upsert based on ID.

    // A. IDs present in input -> Update
    // B. No ID -> Insert
    // C. IDs in DB but not in input -> Delete (We need to fetch existing to know this)

    const { data: existingSkus } = await supabase
        .from('skus')
        .select('id')
        .eq('product_id', productId)

    const existingIds = existingSkus?.map(s => s.id) || []
    const inputIds = data.skus.map(s => s.id).filter(Boolean) as string[]

    // Delete removed SKUs
    const idsToDelete = existingIds.filter(id => !inputIds.includes(id))
    if (idsToDelete.length > 0) {
        await supabase.from('skus').delete().in('id', idsToDelete)
    }

    // Upsert (Insert or Update) rest
    for (const sku of data.skus) {
        if (sku.id) {
            await supabase.from('skus').update({
                weight_label: sku.weight_label,
                weight_grams: sku.weight_grams,
                calculated_vendor_cost: sku.calculated_vendor_cost,
                basic_price: sku.basic_price,
                packing_cost: sku.packing_cost,
                min_selling_price: sku.min_selling_price,
                ahadhiyas_price: sku.ahadhiyas_price,
                mrp: sku.mrp
            }).eq('id', sku.id)
        } else {
            await supabase.from('skus').insert({
                product_id: productId,
                weight_label: sku.weight_label,
                weight_grams: sku.weight_grams,
                calculated_vendor_cost: sku.calculated_vendor_cost,
                basic_price: sku.basic_price,
                packing_cost: sku.packing_cost,
                min_selling_price: sku.min_selling_price,
                ahadhiyas_price: sku.ahadhiyas_price,
                mrp: sku.mrp
            })
        }
    }

    revalidatePath('/dashboard/products')
    redirect('/dashboard/products')
}

export async function deleteProduct(productId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (error) throw new Error('Failed to delete product')
    revalidatePath('/dashboard/products')
}
