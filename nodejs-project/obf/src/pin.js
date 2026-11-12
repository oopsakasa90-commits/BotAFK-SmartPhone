'use strict';
// Khóa công khai của máy chủ (ECDSA P-256, base64). App chỉ nhận chức năng từ máy chủ ký đúng bằng khóa này.
// Tạo cặp khóa bằng worker/scripts/make-keys.js, dán dòng PUBLIC vào đây rồi build lại app.
const base = (process.env.BOTAFK_API || 'https://botafk-license.oopsakasa9-0.workers.dev').replace(/^http/, 'ws').replace(/\/+$/, '');
module.exports = { PUB: 'BHzKC3zuU5bTAS/6EK42abuKj7tobPYLsY77oBT7Py0S69MO23n4N2v5SZPryxgD39hLXIkLL8/QvNIgEccHwZ4=', WS: base + '/api/ws' };
