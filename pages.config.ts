import { isH5 } from '@uni-helper/uni-env'
import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'
import { tabBar } from './src/tabbar/config'

export default defineUniPages({
  globalStyle: {
    navigationStyle: 'default',
    navigationBarTitleText: 'USV 控制',
    navigationBarBackgroundColor: '#667eea',
    navigationBarTextStyle: 'white',
    backgroundColor: '#FFFFFF',
    pageOrientation: 'landscape',
    rpxCalcMaxDeviceWidth: 960, // rpx 计算所支持的最大设备宽度，单位 px，默认值为 960
    rpxCalcBaseDeviceWidth: 375, // rpx 计算使用的基准设备宽度，设备实际宽度超出 rpx 计算所支持的最大设备宽度时将按基准宽度计算，单位 px，默认值为 375
    rpxCalcIncludeWidth: 750, // rpx 计算特殊处理的值，始终按实际的设备宽度计算，单位 rpx，默认值为 750
  },
  easycom: {
    autoscan: true,
    custom: {
      '^fg-(.*)': '@/components/fg-$1/fg-$1.vue',
      '^wd-(.*)': 'wot-design-uni/components/wd-$1/wd-$1.vue',
      '^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)':
        'z-paging/components/z-paging$1/z-paging$1.vue',
    },
  },
  // tabbar 的配置统一在 “./src/tabbar/config.ts” 文件中
  // 无tabbar模式下，h5 设置为 {} 为了防止浏览器报错导致白屏
  tabBar: tabBar || (isH5 ? {} : undefined) as any,
})
