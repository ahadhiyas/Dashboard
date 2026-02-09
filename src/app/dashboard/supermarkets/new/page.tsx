
import { createClient } from '@/lib/supabase/server'
import SupermarketForm from '../supermarket-form'

export default async function NewSupermarketPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let distributors = undefined
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'ADMIN') {
            const { data } = await supabase.from('distributors').select('id, name').order('name')
            distributors = data || []
        }
    }

    return <SupermarketForm distributors={distributors} />
}
