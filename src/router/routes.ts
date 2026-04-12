import type { RouteRecordRaw } from 'vue-router'

const AdminLayout = () => import('@/layout/AdminLayout.vue')

export const dashboardRoute: RouteRecordRaw = {
  path: '/dashboard',
  component: AdminLayout,
  children: [
    {
      path: '',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/DashboardView.vue'),
      meta: {
        title: '首页',
        icon: 'House',
        requiresAuth: true
      }
    }
  ]
}

export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/users',
    component: AdminLayout,
    children: [
      {
        path: '',
        name: 'UserManagement',
        component: () => import('@/views/user/UserManagementView.vue'),
        meta: {
          title: '用户管理',
          icon: 'User',
          requiresAuth: true
        }
      }
    ]
  },
  {
    path: '/example',
    component: AdminLayout,
    meta: {
      title: '示例管理',
      icon: 'Files',
      requiresAuth: true,
      alwaysShow: true
    },
    children: [
      {
        path: 'list',
        name: 'ExampleList',
        component: () => import('@/views/example/ExampleListView.vue'),
        meta: {
          title: '示例列表',
          icon: 'List',
          requiresAuth: true,
          permissions: ['demo:list']
        }
      },
      {
        path: 'form',
        name: 'ExampleCreate',
        component: () => import('@/views/example/ExampleFormView.vue'),
        meta: {
          title: '新建示例',
          requiresAuth: true,
          permissions: ['demo:create'],
          hidden: true,
          activeMenu: '/example/list'
        }
      },
      {
        path: 'form/:id',
        name: 'ExampleEdit',
        component: () => import('@/views/example/ExampleFormView.vue'),
        meta: {
          title: '编辑示例',
          requiresAuth: true,
          permissions: ['demo:edit'],
          hidden: true,
          activeMenu: '/example/list'
        }
      }
    ]
  }
]

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      hidden: true
    }
  },
  dashboardRoute,
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: {
      title: '页面不存在',
      requiresAuth: false,
      hidden: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: {
      requiresAuth: false,
      hidden: true
    }
  }
]
