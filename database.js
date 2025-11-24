export const supabaseclient = supabase.createClient('https://rbyaymvntvoovgmvkqwc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieWF5bXZudHZvb3ZnbXZrcXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDYyMTcsImV4cCI6MjA3NDAyMjIxN30.iGw5OhsSpLXoHXc_RoStzZmahXRwQbKGClOx1Esiu-g')

export const session = async () => {
    const { data, error } = await supabaseclient.auth.getSession()
    if (error) {
        console.log(error);
    }
    console.log(data);
    return data;
}

export const signoutfunc = async () => {
    const { error } = await supabaseclient.auth.signOut()
    if (error) {
        console.error(error);
        return error
    }
    window.location.reload()

}
export const deletedata = async (id) => {
    const { data, error } = await supabaseclient
        .from('appointments')
        .delete()
        .eq('id', id)
        .select()
    if (error) {
        console.log(error);
    }
    window.location.reload()
    return data;
}
