/**
 * GET /admin/api/init
 * 初始化 KV，将 songs:all 设置为空数组（仅当尚未初始化时）。
 * 首次部署后访问一次即可，之后可通过管理后台导入数据。
 */
export async function onRequestGet(context) {
  try {
    const existing = await MY_KV.get('songs:all');
    if (existing !== null) {
      const songs = JSON.parse(existing);
      return Response.json({
        message: '已存在数据，无需初始化',
        count: songs.length
      });
    }

    await MY_KV.put('songs:all', JSON.stringify([]));
    return Response.json({ message: '初始化成功', count: 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
