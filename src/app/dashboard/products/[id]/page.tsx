
import { createClient } from '@/lib/supabase/server'
import ProductForm from '../product-form'
import { notFound } from 'next/navigation'

export default async function EditProductPage({ params }: { params: { id: string } }) {
    // Await params object for dynamic routing (Next.js 15+)
    const { id } = await params

    const supabase = await createClient()

    // Fetch Product & SKUs
    const { data: product } = await supabase
        .from('products')
        .select('*, skus(*)')
        .eq('id', id)
        .single()

    if (!product) {
        notFound()
    }

    return <ProductForm initialData={product} />
}
