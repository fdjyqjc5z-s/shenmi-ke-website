import 'dotenv/config';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000/api';
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('请先设置 ADMIN_PASSWORD，用于冒烟测试登录后台。');
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = typeof body === 'object' && body?.message ? body.message : text;
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${message}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log(`开始后台冒烟测试：${baseUrl}`);

const loginResp = await request('/admin/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});

const token = loginResp?.data?.token;
assert(token, '登录接口未返回 admin token');
console.log('✅ 管理员登录通过');

const authHeaders = { Authorization: `Bearer ${token}` };

await request('/admin/dashboard/stats', { headers: authHeaders });
console.log('✅ 仪表盘统计接口通过');

const productResp = await request('/admin/products?page=1&pageSize=5', { headers: authHeaders });
assert(Array.isArray(productResp?.data?.list), '商品列表返回结构异常');
console.log('✅ 商品列表接口通过');

await request('/admin/orders', { headers: authHeaders });
console.log('✅ 订单列表接口通过');

await request('/admin/tasks', { headers: authHeaders });
console.log('✅ 任务列表接口通过');

const userResp = await request('/admin/users?page=1&pageSize=5', { headers: authHeaders });
assert(Array.isArray(userResp?.data?.list), '用户列表返回结构异常');
console.log('✅ 用户列表接口通过');

const withdrawResp = await request('/admin/withdraws?page=1&pageSize=5', { headers: authHeaders });
assert(Array.isArray(withdrawResp?.data?.list), '提现列表返回结构异常');
console.log('✅ 提现列表接口通过');

const aiDraftResp = await request('/admin/ai/drafts', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ draftType: 'reply', inputText: '测试客服回复草稿' })
});
assert(aiDraftResp?.data?.id, 'AI占位草稿创建失败');
console.log('✅ AI占位草稿创建接口通过');

await request('/admin/ai/drafts?page=1&pageSize=5', { headers: authHeaders });
console.log('✅ AI占位草稿列表接口通过');

console.log('🎉 后台核心接口冒烟测试完成');
