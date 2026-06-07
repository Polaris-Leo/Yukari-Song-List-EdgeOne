export async function onRequestPost(context) {
  try {
    const incoming = await context.request.json();

    if (!Array.isArray(incoming)) {
      return Response.json({ error: 'Input must be an array of songs' }, { status: 400 });
    }

    const raw      = await MY_KV.get('songs:all');
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
    await MY_KV.put('songs:all', JSON.stringify(all));

    return Response.json({ success: true, count: toImport.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
