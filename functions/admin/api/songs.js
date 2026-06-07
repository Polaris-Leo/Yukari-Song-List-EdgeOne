export async function onRequestPost(context) {
  try {
    const { title, artist, language, status } = await context.request.json();

    if (!title || !artist) {
      return Response.json({ error: 'Title and Artist are required' }, { status: 400 });
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

    return Response.json({ success: true, id: newId });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
