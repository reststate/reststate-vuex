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
      { text: '/mobx', link: 'https://mobx.reststate.org' },
      { text: '/client', link: 'https://client.reststate.org' },
      { text: 'home', link: 'https://reststate.org' },
    ],
    sidebar: ['/', 'tutorial', 'installation', 'reading-data', 'writing-data'],
    displayAllHeaders: true,
  },
};
