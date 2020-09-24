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
this.$store.dispatch('widgets/loadById', { id: 42 }).then(() => {
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
this.$store.dispatch('widgets/loadWhere', { filter }).then(() => {
  const widgets = this.$store.getters['widgets/where']({ filter });
  console.log(widgets);
});
```

This doesn’t perform any filtering logic on the client side; it simply keeps track of which IDs were returned by the server side request and retrieves those records.

## loadPage action / page getter

If your API supports pagination, you can request paginated data using the `loadPage` action. JSON:API reserves the `page` query parameter for pagination parameters, but doesn't define which specific parameters are used; pass whichever keys your server expects. You can access the returned page of data via the `page` getter:

```js
const options = {
  'page[size]': 10,
  'page[number]': 2,
};
this.$store.dispatch('widgets/loadPage', { options }).then(() => {
  const widgets = this.$store.getters['widgets/page'];
  console.log(widgets);
});
```

Servers can optionally return `next` and `prev` pagination links. If they are available, the `hasNext` and `hasPrevious` getters respectively will return true. You can load the next or previous page using the `loadNextPage` or `loadPreviousPage` actions:

```js
this.$store.dispatch('widgets/loadNextPage').then(() => {
  const widgets = this.$store.getters['widgets/page'];
  console.log(widgets);
  this.$store.dispatch('widgets/loadPreviousPage').then(() => {
    const widgets = this.$store.getters['widgets/page'];
    console.log(widgets);
  });
});
```

## loadRelated action / related getter

To load records related via JSON:API relationships, use the `loadRelated` action. A nested resource URL is constructed like `categories/27/widgets`. (In the future we will look into using HATEOAS to let the server tell us the relationship URL).

```javascript
const parent = {
  type: 'category',
  id: '27',
};

this.$store.dispatch('widgets/loadRelated', { parent }).then(() => {
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

this.$store
  .dispatch('widgets/loadRelated', { parent, relationship })
  .then(() => {
    const widgets = this.$store.getters['widgets/related']({
      parent,
      relationship,
    });
    console.log(widgets);
  });
```

## Meta Information

When a load response from the server contains a `meta` key, it is exposed via the `meta` getter. One way the `meta` information is sometimes used is to provide pagination information, such as the total number of pages.

## Loading and Error States

The status of a loading action is reported in two getters: `isLoading` and `isError`.

If the load action errors out, the error response is available in the `error` getter. Note that only load actions currently expose their error in the `error` getter; errors for write actions can be accessed by catching the promise returned by the write action.

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

## Including Related Resources

Sometimes you don't want to make separate `loadRelated` calls for each relationship. For cases like this, Reststate/Vuex supports JSON:API's `include` property to eagerly load related data. It can be passed to any `load` action:

```js
this.$store.dispatch('posts/loadAll', {
  options: {
    include: 'category,comments,comments.user',
  }
});
```

Note that `include` allows you to specify multiple relationship using the format JSON:API defines: each relationship is separated via a comma, and chained relationships are specified using dots.

Included data will be stored in the Vuex module with the name corresponding to each resource. For example, if the above query returns records of types `posts`, `categories`, `comments`, and `users`, you would need to have modules like so to store them:

```js
mapResourceModules({
  names: [
    'posts',
    'categories',
    'comments',
    'users',
  ],
  httpClient: api,
}),
```

Related data loaded via `include` can be accessed with the `related` getter, just like related data loaded via `loadRelated`:

```js
const comments = this.$store.getters['comments/related']({ parent: post });
```

As with data loaded via `loadRelated`, if the relationship name is not the same as the name of the resource, you can pass it as an argument:

```js
this.$store.dispatch('posts/loadAll', {
  options: {
    include: 'secretComments',
  }
}).then(() => {
  const secretComments = this.$store.getters['comments/related']({
    parent: post,
    relationship: 'secretComments',
  });
  console.log(secretComments);
});
```
