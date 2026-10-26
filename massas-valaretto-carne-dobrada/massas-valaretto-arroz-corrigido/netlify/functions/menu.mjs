import { getStore } from '@netlify/blobs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function response(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export default async (request) => {
  const store = getStore('valaretto-menu');
  const method = request.method || 'GET';
  const url = new URL(request.url);

  if (method === 'GET' && url.searchParams.get('auth') === '1') {
    const expected = process.env.ADMIN_PASSWORD;
    const supplied = request.headers.get('x-admin-password') || '';
    if (!expected || supplied !== expected) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: JSON_HEADERS });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }

  if (method === 'GET') {
    const menu = await store.get('current', { type: 'json' });
    if (!menu) return new Response(JSON.stringify({ error: 'Menu ainda não salvo no editor.' }), { status: 404, headers: JSON_HEADERS });
    return new Response(JSON.stringify(menu), { status: 200, headers: JSON_HEADERS });
  }

  if (method === 'POST') {
    const expected = process.env.ADMIN_PASSWORD;
    const supplied = request.headers.get('x-admin-password') || '';
    if (!expected || supplied !== expected) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: JSON_HEADERS });

    let payload;
    try { payload = await request.json(); } catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: JSON_HEADERS }); }

    const cleaned = {
      date: String(payload.date || '').slice(0, 30),
      arrozOptions: Array.isArray(payload.arrozOptions) ? payload.arrozOptions.map(String).map(v => v.trim()).filter(Boolean).slice(0, 6) : ['Arroz Branco'],
      notice: String(payload.notice || '').slice(0, 180),
      refogados: Array.isArray(payload.refogados) ? payload.refogados.map(String).map(v => v.trim()).filter(Boolean).slice(0, 20) : [],
      massas: Array.isArray(payload.massas) ? payload.massas.map(String).map(v => v.trim()).filter(Boolean).slice(0, 20) : [],
      carnes: Array.isArray(payload.carnes) ? payload.carnes.map(String).map(v => v.trim()).filter(Boolean).slice(0, 5) : []
    };
    await store.setJSON('current', cleaned);
    return new Response(JSON.stringify({ ok: true, menu: cleaned }), { status: 200, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: JSON_HEADERS });
};
