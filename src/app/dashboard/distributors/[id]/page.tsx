
import { createClient } from '@/lib/supabase/server'
import DistributorForm from '../distributor-form'
import { notFound } from 'next/navigation'

export default async function EditDistributorPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: distributor } = await supabase
        .from('distributors')
        .select('*, profiles(email)')
        .eq('id', id)
        .single()

    if (!distributor) {
        notFound()
    }

    // Flatten the profile email into the data object
    const data = {
        ...distributor,
        email: distributor.profiles?.email
    }

    return <DistributorForm initialData={data} />
}
