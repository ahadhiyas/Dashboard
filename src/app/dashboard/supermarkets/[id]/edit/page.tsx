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

    // Check if admin to fetch distributors list
    const { data: { user } } = await supabase.auth.getUser()
    let distributors = undefined
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'ADMIN') {
            const { data } = await supabase.from('distributors').select('id, name').order('name')
            distributors = data || []
        }
    }

    return <SupermarketForm initialData={supermarket} distributors={distributors} />
}
