<template>
  <section>
    <h1 class="section-title">商品管理</h1>

    <button class="action-btn" style="margin-bottom:12px;">新建商品</button>

    <div class="list-card" v-for="item in products" :key="item.id">
      <div style="flex:1">
        <h3>{{ item.name }}</h3>
        <p class="muted">库存: {{ item.stock }} | 状态: {{ item.status }}</p>
      </div>
      <button class="action-btn" @click="toggleStatus(item)">上下架</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const products = ref([]);

async function fetchProducts() {
  const resp = await axios.get('/api/admin/products');
  products.value = resp.data.data;
}

async function toggleStatus(product) {
  const newStatus = product.status === 'on' ? 'off' : 'on';
  await axios.patch(`/api/admin/products/${product.id}/status`, { status: newStatus });
  await fetchProducts();
}

fetchProducts();
</script>
