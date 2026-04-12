import ElementPlus from 'element-plus'
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
app.use(ElementPlus)

app.mount('#app')
