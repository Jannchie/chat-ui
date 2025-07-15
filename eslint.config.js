import jannchie from '@jannchie/eslint-config'

export default jannchie({
  unocss: true,
}, {
  rules: {
    'antfu/no-top-level-await': 'off',
  },
})
