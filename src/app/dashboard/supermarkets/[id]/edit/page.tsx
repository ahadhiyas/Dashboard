import { createClient } from '@/lib/supabase/server'
import SupermarketForm from '../../supermarket-form'
import { notFound } from 'next/navigation'

export default async function EditSupermarketPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: supermarket } = await supabase
        .from('supermarkets')
        .select('*')
        .eq('id', id)
        .single()

    if (!supermarket) {
        notFound()
    }

    return <SupermarketForm initialData={supermarket} />
}
