# @reststate/vuex

:::danger
This package is no longer maintained.
:::

`@reststate/vuex` allows you to access data from a [JSON:API](http://jsonapi.org/) web service via [Vuex](https://vuex.vuejs.org/) stores. Because of JSON:API's strong conventions, in most cases all you should need to do is tell `@reststate/vuex` the base URL of your web service, and which resources to access, and you should be set. No manual web request juggling!

This is a very early proof-of-concept, so many features of JSON:API are not yet supported. Open a GitHub issue with any other features you'd like to see!

## Synopsis

```javascript
const store = new Vuex.Store({
  modules: {
    'widgets': resourceModule({
      name: 'widgets',
      httpClient: axios.create(...),
    }),
  },
});

const component = {
  methods: {
    ...mapActions({
      loadAllWidgets: 'widgets/loadAll',
    }),
  },
  computed: {
    ...mapGetters({
      widgets: 'widgets/all',
    }),
  },
};
```

## License

Apache 2.0
