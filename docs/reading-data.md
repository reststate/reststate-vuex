# Reading Data

Working with JSON:API data is split into two parts to follow Vuex conventions:

- **Actions** are used to request data from the server or update data on the server, storing the results into the module's state.
- **Getters** are used to access data from the module's state.

## loadAll action / all getter

So, for example, to retrieve all of the records for a resource, dispatch the `loadAll` action to save them into the store. They can then be accessed using `all` getter:

```javascript
this.$store.dispatch('widgets/loadAll').then(() => {
  const widgets = this.$store.getters['widgets/all'];
  console.log(widgets);
});
```

If you're accessing these from within a Vue component, you can use Vuex's `mapActions` and `mapGetters` as usual:

```javascript
import { mapActions, mapGetters } from 'vuex';

export default {
  // ...
  methods: {
    ...mapActions({
      loadWidgets: 'widgets/loadAll',
    }),
  },
  computed: {
    ...mapGetters({
      widgets: 'widgets/all',
    }),
  },
  // ...
};
```

## loadById action / byId getter

To retrieve a single record by ID, dispatch the `loadById` action, then access the `byId` getter:

```javascript
this.$store.dispatch('widgets/loadById', { id: 42 })
  .then(() => {
    const widget = this.$store.getters['widgets/byId']({ id: 42 });
    console.log(widget);
  });
```

Note that the ID needs to be a string, as specified by the JSON:API spec.

If you know the record has already been retrieved, you don't need to load it again. For example, if you've loaded all records on a list screen, and then you click to view the details for a single record, you can just use the getter directly:

```javascript
const widget = this.$store.getters['widgets/byId']({ id: '42' });
console.log(widget);
```

## loadWhere action / where getter

To filter/query for records based on certain criteria, use the `loadWhere` action, passing it an object of filter keys and values to send to the server, then pass those same filters to the `where` getter:

```js
const filter = {
  category: 'whizbang',
};
this.$store.dispatch('widgets/loadWhere', { filter });
  .then(() => {
    const widgets = this.$store.getters['widgets/where']({ filter });
    console.log(widgets);
  });
```

This doesn’t perform any filtering logic on the client side; it simply keeps track of which IDs were returned by the server side request and retrieves those records.

## loadRelated action / related getter

Finally, to load records related via JSON:API relationships, use the `loadRelated` action. A nested resource URL is constructed like `categories/27/widgets`. (In the future we will look into using HATEOAS to let the server tell us the relationship URL).

```javascript
const parent = {
  type: 'category',
  id: '27',
};

this.$store.dispatch('widgets/loadRelated', { parent })
  .then(() => {
    const widgets = this.$store.getters['widgets/related']({ parent });
    console.log(widgets);
  });
```

By default, the name of the relationship on `parent` is assumed to be the same as the name of the other model: in this case, `widgets`. In cases where the names are not the same, you can explicitly pass the relationship name:

```js
const parent = {
  type: 'categories',
  id: '27',
};

const relationship = 'purchased-widgets';

this.$store.dispatch('widgets/loadRelated', { parent, relationship })
  .then(() => {
    const widgets = this.$store.getters['widgets/related']({ parent, relationship });
    console.log(widgets);
  });
```

## Options

All actions take an optional `options` property, consisting of an object of additional options to pass. Each key/value pair in the object is translated into a query string parameter key/value pair:

```js
this.$store.dispatch('widgets/loadAll', {
  options: {
    'fields[widgets]': 'title,description',
  },
});

// requests to widgets?fields[widgets]=title,description
```
