const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  try {
    const { title, artist, language, status } = await context.request.json();

    if (!title || !artist) {
      return new Response(JSON.stringify({ error: 'Title and Artist are required' }), { status: 400, headers: JSON_HEADERS });
    }

    const raw   = await Yukari_Songs.get('songs_all');
    const songs = raw ? JSON.parse(raw) : [];

    const maxId  = songs.length > 0 ? Math.max(...songs.map(s => s.id)) : 0;
    const newId  = maxId + 1;
    const newSong = {
      id:       newId,
      title,
      artist,
      language: language || '中文',
      status:   status   || 'normal'
    };

    songs.push(newSong);
    await Yukari_Songs.put('songs_all', JSON.stringify(songs));

    return new Response(JSON.stringify({ success: true, id: newId }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
