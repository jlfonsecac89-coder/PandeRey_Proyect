const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('Orders')
    .select('*')
    .limit(1);
    
  console.log('Orders (PascalCase):', data ? Object.keys(data[0] || {}) : null, error);

  const { data: d2, error: e2 } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  console.log('orders (snake_case):', d2 ? Object.keys(d2[0] || {}) : null, e2);
}

test();
