// Yukari_Songs is the EdgeOne KV namespace binding configured in the EdgeOne console
// Data layout: songs_all → JSON array of {id, title, artist, language, status}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page    = parseInt(url.searchParams.get('page')     || '1');
  const limit   = parseInt(url.searchParams.get('limit')    || '24');
  const search  = (url.searchParams.get('search')           || '').toLowerCase().trim();
  const language = url.searchParams.get('language')         || 'ALL';

  try {
    const raw = await Yukari_Songs.get('songs_all');
    let songs = raw ? JSON.parse(raw) : [];

    if (search) {
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(search) ||
        s.artist.toLowerCase().includes(search)
      );
    }

    if (language !== 'ALL') {
      songs = songs.filter(s => s.language === language);
    }

    songs.sort((a, b) => b.id - a.id);

    const total      = songs.length;
    const offset     = (page - 1) * limit;
    const data       = songs.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return new Response(JSON.stringify({ data, total, page, limit, totalPages }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
