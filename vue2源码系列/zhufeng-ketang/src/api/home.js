import axios from '@/utils/axios.js'

// 设置接口  state -> action-types -> api -> actions -> mutations
export const fetchSlides = ()=> axios.get('/api/slider');