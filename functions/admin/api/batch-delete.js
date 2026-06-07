const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  try {
    const { ids } = await context.request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'ids must be a non-empty array' }), { status: 400, headers: JSON_HEADERS });
    }

    const raw   = await Yukari_Songs.get('songs_all');
    const songs = raw ? JSON.parse(raw) : [];
    const idSet = new Set(ids.map(Number));
    const filtered = songs.filter(s => !idSet.has(s.id));

    await Yukari_Songs.put('songs_all', JSON.stringify(filtered));

    return new Response(JSON.stringify({ success: true, count: ids.length }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
