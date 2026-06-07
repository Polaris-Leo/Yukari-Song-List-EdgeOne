const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestGet(context) {
  try {
    const raw  = await Yukari_Songs.get('songs_all');
    const songs = raw ? JSON.parse(raw) : [];
    const pool  = songs.filter(s => s.status !== 'banned');

    if (pool.length === 0) {
      return new Response('null', { headers: JSON_HEADERS });
    }

    const song = pool[Math.floor(Math.random() * pool.length)];
    return new Response(JSON.stringify(song), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
