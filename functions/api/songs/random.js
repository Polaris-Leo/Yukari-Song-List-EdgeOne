export async function onRequestGet(context) {
  try {
    const raw  = await MY_KV.get('songs:all');
    const songs = raw ? JSON.parse(raw) : [];
    const pool  = songs.filter(s => s.status !== 'banned');

    if (pool.length === 0) {
      return Response.json(null);
    }

    const song = pool[Math.floor(Math.random() * pool.length)];
    return Response.json(song);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
