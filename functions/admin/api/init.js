/**
 * GET /admin/api/init
 * 初始化 KV，将 songs_all 设置为空数组（仅当尚未初始化时）。
 * 首次部署后访问一次即可，之后可通过管理后台导入数据。
 */
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestGet(context) {
  try {
    const existing = await Yukari_Songs.get('songs_all');
    if (existing !== null) {
      const songs = JSON.parse(existing);
      return new Response(JSON.stringify({ message: '已存在数据，无需初始化', count: songs.length }), { headers: JSON_HEADERS });
    }

    await Yukari_Songs.put('songs_all', JSON.stringify([]));
    return new Response(JSON.stringify({ message: '初始化成功', count: 0 }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}
