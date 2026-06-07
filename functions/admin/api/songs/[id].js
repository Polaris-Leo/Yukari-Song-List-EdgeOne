export async function onRequestPut(context) {
  try {
    const id                                  = parseInt(context.params.id);
    const { title, artist, language, status } = await context.request.json();

    const raw   = await Yukari_Songs.get('songs:all');
    const songs = raw ? JSON.parse(raw) : [];

    const idx = songs.findIndex(s => s.id === id);
    if (idx === -1) {
      return Response.json({ error: 'Song not found' }, { status: 404 });
    }

    songs[idx] = { ...songs[idx], title, artist, language, status };
    await Yukari_Songs.put('songs:all', JSON.stringify(songs));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const id = parseInt(context.params.id);

    const raw      = await Yukari_Songs.get('songs:all');
    const songs    = raw ? JSON.parse(raw) : [];
    const filtered = songs.filter(s => s.id !== id);

    if (filtered.length === songs.length) {
      return Response.json({ error: 'Song not found' }, { status: 404 });
    }

    await Yukari_Songs.put('songs:all', JSON.stringify(filtered));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
