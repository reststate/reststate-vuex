module.exports = {
  title: '@reststate/vuex',
  plugins: [
    [
      '@vuepress/google-analytics',
      {
        ga: 'UA-128167246-2',
      },
    ],
  ],
  themeConfig: {
    nav: [
      { text: '@reststate/vuex', link: '/' },
      { text: 'github', link: 'https://github.com/reststate/reststate-vuex' },
      { text: '/mobx', link: 'https://mobx.reststate.codingitwrong.com' },
      { text: '/client', link: 'https://client.reststate.codingitwrong.com' },
      { text: 'home', link: 'https://reststate.codingitwrong.com' },
    ],
    sidebar: ['/', 'tutorial', 'installation', 'reading-data', 'writing-data'],
    displayAllHeaders: true,
  },
};
