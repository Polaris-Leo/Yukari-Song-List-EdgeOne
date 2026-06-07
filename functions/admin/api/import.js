const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  try {
    const incoming = await context.request.json();

    if (!Array.isArray(incoming)) {
      return new Response(JSON.stringify({ error: 'Input must be an array of songs' }), { status: 400, headers: JSON_HEADERS });
    }

    const raw      = await Yukari_Songs.get('songs_all');
    const existing = raw ? JSON.parse(raw) : [];

    const maxId    = existing.length > 0 ? Math.max(...existing.map(s => s.id)) : 0;

    const toImport = incoming.map((s, i) => ({
      id:       maxId + i + 1,
      title:    s.title,
      artist:   s.artist,
      language: s.language || '中文',
      status:   s.status   || 'normal'
    }));

    const all = [...existing, ...toImport];
    await Yukari_Songs.put('songs_all', JSON.stringify(all));

    return new Response(JSON.stringify({ success: true, count: toImport.length }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
