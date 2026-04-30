import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import './styles/admin-theme.css';

createApp(App).use(createPinia()).use(router).mount('#admin-app');