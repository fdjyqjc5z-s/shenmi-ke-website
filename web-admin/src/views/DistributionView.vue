<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">分销管理</h1>
        <p class="muted">查看一级绑定关系，设置平台默认返利，也可以给单个下级自定义返利规则。</p>
      </div>
      <button class="action-btn" @click="fetchOverview">刷新</button>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="successMessage" class="glass-card success-card">{{ successMessage }}</div>

    <div class="glass-card settings-card">
      <h2>平台默认分销设置</h2>
      <div class="form-grid">
        <input class="form-input" v-model="settings.platformCode" placeholder="你的平台分销码，可填你的邀请码" />
        <select class="form-input" v-model="settings.status">
          <option value="enabled">启用分销</option>
          <option value="disabled">关闭分销</option>
        </select>
        <select class="form-input" v-model="settings.defaultBuyerRebateType">
          <option value="fixed">客户返利：固定金额</option>
          <option value="percent">客户返利：订单百分比</option>
        </select>
        <input class="form-input" v-model.number="settings.defaultBuyerRebateValue" type="number" min="0" placeholder="客户买完返利数值" />
        <select class="form-input" v-model="settings.defaultOwnerRebateType">
          <option value="fixed">上级返现：固定金额</option>
          <option value="percent">上级返现：订单百分比</option>
        </select>
        <input class="form-input" v-model.number="settings.defaultOwnerRebateValue" type="number" min="0" placeholder="下级购买返现给上级数值" />
      </div>
      <p class="muted rule-tip">百分比模式填写 10 代表订单金额的 10%；固定金额模式填写 2 代表每单返 2 元。</p>
      <button class="action-btn" @click="saveSettings">保存默认设置</button>
    </div>

    <div class="glass-card toolbar">
      <input class="form-input" v-model="filters.keyword" placeholder="搜索下级账号 / 编码 / 上级邀请码" @keyup.enter="fetchOverview" />
      <button class="action-btn" @click="fetchOverview">查询</button>
    </div>

    <div v-if="loading" class="glass-card">正在读取分销数据...</div>

    <template v-else>
      <h2 class="section-title">一级绑定用户</h2>
      <div v-if="users.length === 0" class="glass-card muted">暂无绑定分销码的用户</div>
      <div class="list-card" v-for="item in users" :key="item.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <span class="badge">一级下级</span>
            <span class="badge">规则：{{ item.rule_status || '默认' }}</span>
          </div>
          <h3>{{ item.nickname || item.username }}</h3>
          <p class="muted">下级账号：{{ item.username }} | 编码：{{ item.user_code }}</p>
          <p class="muted">绑定上级：{{ item.inviter_nickname || item.inviter_username || '--' }} | 上级编码：{{ item.inviter_user_code || '--' }} | 上级邀请码：{{ item.inviter_invite_code || '--' }}</p>
          <p class="muted">客户已返利：{{ item.buyer_rebate_total || 0 }} 元 | 上级已返现：{{ item.owner_rebate_total || 0 }} 元</p>
          <p class="muted">当前规则：客户 {{ ruleText(item.buyer_rebate_type, item.buyer_rebate_value) }}；上级 {{ ruleText(item.owner_rebate_type, item.owner_rebate_value) }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn" @click="openRuleForm(item)">设置返利</button>
        </div>
      </div>

      <h2 class="section-title">返利记录</h2>
      <div v-if="logs.length === 0" class="glass-card muted">暂无返利记录</div>
      <div class="list-card" v-for="log in logs" :key="log.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <span class="badge">{{ rewardTypeText(log.reward_type) }}</span>
            <span class="badge">{{ log.status }}</span>
          </div>
          <h3>{{ log.order_no }}</h3>
          <p class="muted">购买用户：{{ log.buyer_username || '--' }} / {{ log.buyer_user_code || '--' }}</p>
          <p class="muted">收款用户：{{ log.receiver_username || '--' }} / {{ log.receiver_user_code || '--' }}</p>
          <p class="muted">返利金额：{{ log.reward_amount }} 元 | 规则：{{ ruleText(log.reward_rule_type, log.reward_rule_value) }}</p>
          <p class="muted">发放时间：{{ formatTime(log.paid_at || log.created_at) }}</p>
        </div>
      </div>
    </template>

    <div v-if="rulePanelVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <h2>设置单个下级返利</h2>
        <p class="muted">下级：{{ activeUser?.nickname || activeUser?.username }} / {{ activeUser?.user_code }}</p>
        <p class="muted">上级：{{ activeUser?.inviter_nickname || activeUser?.inviter_username || '--' }} / {{ activeUser?.inviter_user_code || '--' }}</p>
        <div class="form-grid single">
          <select class="form-input" v-model="ruleForm.buyerRebateType">
            <option value="fixed">客户返利：固定金额</option>
            <option value="percent">客户返利：百分比</option>
          </select>
          <input class="form-input" v-model.number="ruleForm.buyerRebateValue" type="number" min="0" placeholder="客户买完返利" />
          <select class="form-input" v-model="ruleForm.ownerRebateType">
            <option value="fixed">上级返现：固定金额</option>
            <option value="percent">上级返现：百分比</option>
          </select>
          <input class="form-input" v-model.number="ruleForm.ownerRebateValue" type="number" min="0" placeholder="下级购买返现给上级" />
          <select class="form-input" v-model="ruleForm.status">
            <option value="enabled">启用规则</option>
            <option value="disabled">停用规则</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="action-btn" @click="saveUserRule">保存规则</button>
          <button class="action-btn ghost-btn" @click="closeRuleForm">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import http from '../utils/http.js';

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const users = ref([]);
const logs = ref([]);
const rulePanelVisible = ref(false);
const activeUser = ref(null);

const filters = reactive({ keyword: '' });

const settings = reactive({
  platformCode: '',
  defaultBuyerRebateType: 'fixed',
  defaultBuyerRebateValue: 0,
  defaultOwnerRebateType: 'fixed',
  defaultOwnerRebateValue: 0,
  status: 'disabled'
});

const ruleForm = reactive({
  buyerRebateType: 'fixed',
  buyerRebateValue: 0,
  ownerRebateType: 'fixed',
  ownerRebateValue: 0,
  status: 'enabled'
});

function ruleText(type, value) {
  const number = Number(value || 0);
  if (!number) return '未设置';
  return type === 'percent' ? `${number}%` : `${number} 元`;
}

function rewardTypeText(type) {
  const map = { buyer_rebate: '客户返利', owner_rebate: '上级返现' };
  return map[type] || type;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

function fillSettings(data) {
  settings.platformCode = data.platform_code || '';
  settings.defaultBuyerRebateType = data.default_buyer_rebate_type || 'fixed';
  settings.defaultBuyerRebateValue = Number(data.default_buyer_rebate_value || 0);
  settings.defaultOwnerRebateType = data.default_owner_rebate_type || 'fixed';
  settings.defaultOwnerRebateValue = Number(data.default_owner_rebate_value || 0);
  settings.status = data.status || 'disabled';
}

async function fetchOverview() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/distribution/overview', { params: { keyword: filters.keyword } });
    const data = resp.data.data || {};
    fillSettings(data.settings || {});
    users.value = data.users || [];
    logs.value = data.logs || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '分销数据读取失败';
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await http.put('/admin/distribution/settings', { ...settings });
    successMessage.value = '默认分销设置已保存';
    await fetchOverview();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '分销设置保存失败';
  }
}

function openRuleForm(user) {
  activeUser.value = user;
  ruleForm.buyerRebateType = user.buyer_rebate_type || settings.defaultBuyerRebateType || 'fixed';
  ruleForm.buyerRebateValue = Number(user.buyer_rebate_value || settings.defaultBuyerRebateValue || 0);
  ruleForm.ownerRebateType = user.owner_rebate_type || settings.defaultOwnerRebateType || 'fixed';
  ruleForm.ownerRebateValue = Number(user.owner_rebate_value || settings.defaultOwnerRebateValue || 0);
  ruleForm.status = user.rule_status || 'enabled';
  rulePanelVisible.value = true;
}

function closeRuleForm() {
  activeUser.value = null;
  rulePanelVisible.value = false;
}

async function saveUserRule() {
  if (!activeUser.value) return;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await http.put('/admin/distribution/users/' + activeUser.value.id + '/rule', { ...ruleForm });
    successMessage.value = '单个用户返利规则已保存';
    closeRuleForm();
    await fetchOverview();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '用户返利规则保存失败';
  }
}

onMounted(fetchOverview);
</script>

<style scoped>
.page-head,
.toolbar,
.badge-row,
.row-actions,
.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.settings-card,
.toolbar {
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-grid.single {
  grid-template-columns: 1fr;
}

.toolbar {
  flex-wrap: wrap;
}

.toolbar .form-input {
  max-width: 320px;
  margin-bottom: 0;
}

.rule-tip {
  font-size: 13px;
}

.row-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 220px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(3, 3, 12, 0.72);
  backdrop-filter: blur(10px);
}

.modal-card {
  width: min(92vw, 520px);
}

.danger-card {
  color: #ffb4c1;
  border-color: rgba(255, 80, 120, 0.35);
  margin-bottom: 14px;
}

.success-card {
  color: #b9ffdd;
  border-color: rgba(80, 255, 174, 0.35);
  margin-bottom: 14px;
}
</style>
