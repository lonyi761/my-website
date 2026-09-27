import { createApp } from 'vue'
import './style.css'
import '@mdi/font/css/materialdesignicons.css' // 引入圖示
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')