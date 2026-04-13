import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createApp } from 'vue'
import App from './App.vue'
import { setupPermissionDirective } from './directives/permission'
import { router } from './router'
import { pinia } from './stores'
import './styles/index.scss'
import 'element-plus/dist/index.css'

const app = createApp(App)

app.use(pinia)
setupPermissionDirective(app)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})

app.mount('#app')
