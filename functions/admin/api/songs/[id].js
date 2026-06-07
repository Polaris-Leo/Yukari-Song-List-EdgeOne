const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestPut(context) {
  try {
    const id                                  = parseInt(context.params.id);
    const { title, artist, language, status } = await context.request.json();

    const raw   = await Yukari_Songs.get('songs_all');
    const songs = raw ? JSON.parse(raw) : [];

    const idx = songs.findIndex(s => s.id === id);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Song not found' }), { status: 404, headers: JSON_HEADERS });
    }

    songs[idx] = { ...songs[idx], title, artist, language, status };
    await Yukari_Songs.put('songs_all', JSON.stringify(songs));

    return new Response(JSON.stringify({ success: true }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}

export async function onRequestDelete(context) {
  try {
    const id = parseInt(context.params.id);

    const raw      = await Yukari_Songs.get('songs_all');
    const songs    = raw ? JSON.parse(raw) : [];
    const filtered = songs.filter(s => s.id !== id);

    if (filtered.length === songs.length) {
      return new Response(JSON.stringify({ error: 'Song not found' }), { status: 404, headers: JSON_HEADERS });
    }

    await Yukari_Songs.put('songs_all', JSON.stringify(filtered));

    return new Response(JSON.stringify({ success: true }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
