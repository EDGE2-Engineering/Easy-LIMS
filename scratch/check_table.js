import { supabase } from '../src/lib/customSupabaseClient.js';

async function checkTable() {
    const { data, error } = await supabase
        .from('sampling')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error checking sampling table:", error.message);
        if (error.code === '42P01') {
            console.log("Table 'sampling' does not exist.");
        }
    } else {
        console.log("Table 'sampling' exists.");
    }
}

checkTable();
