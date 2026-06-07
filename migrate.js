/**
 * 数据迁移脚本：将 songs.json (从 Cloudflare D1 导出) 上传到 EdgeOne KV
 *
 * 用法:
 *   1. 从 Cloudflare D1 导出数据:
 *      在 Cloudflare Dashboard → D1 → yukari-song-list → 运行查询:
 *        SELECT json_group_array(json_object(
 *          'id', id, 'title', title, 'artist', artist,
 *          'language', language, 'status', status
 *        )) FROM songs;
 *      将结果保存为 songs.json (数组格式)
 *
 *   2. 部署项目到 EdgeOne 并配置好 KV 绑定 (Yukari_Songs，命名空间 ID: ns-KfUC07C1bT9C)
 *
 *   3. 访问 POST /admin/api/import，请求体为 songs.json 的内容:
 *      curl -X POST https://your-site/admin/api/import \
 *        -H "Content-Type: application/json" \
 *        -H "Cookie: yukari_admin_session=<登录后的Cookie值>" \
 *        -d @songs.json
 *
 * 或者也可以在登录管理后台后，通过"导入 CSV 歌单"功能直接导入原始 CSV 文件。
 */
console.log('请阅读本文件的注释，按步骤手动执行数据迁移。');
