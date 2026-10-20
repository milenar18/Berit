import { createClient } from 'npm:@supabase/supabase-js@2.108.0';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  try {
    const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, { error: 'Faça login novamente.' });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply(401, { error: 'Faça login novamente.' });
    const { data: profile, error: profileError } = await admin.from('profiles').select('role,must_change_password').eq('id', user.id).single();
    if (profileError || profile?.role !== 'admin' || profile.must_change_password) return reply(403, { error: 'Acesso restrito a administradores com senha definitiva.' });
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name || name.length > 100 || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || password.length > 128) return reply(400, { error: 'Informe nome, e-mail válido e senha provisória de 6 a 128 caracteres.' });
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: 'admin' }, user_metadata: { name } });
    if (error) return reply(400, { error: 'Não foi possível cadastrar. Verifique se o e-mail já está cadastrado e se a senha atende aos requisitos.' });
    return reply(201, { message: 'Administrador cadastrado. Compartilhe a senha provisória com segurança. A troca será obrigatória no primeiro acesso.' });
  } catch {
    return reply(400, { error: 'Não foi possível processar o cadastro.' });
  }
});
