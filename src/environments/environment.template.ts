export const environment = {
  production: false,
  supabase: {
    url: process.env['SUPABASE_URL'] || 'https://your-project.supabase.co',
    anonKey: process.env['SUPABASE_ANON_KEY'] || 'your-anon-key',
    serviceKey: process.env['SUPABASE_SERVICE_KEY'] || 'your-service-key'
  }
};