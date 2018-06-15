# vuex-jsonapi

`vuex-jsonapi`, unsurprisingly, allows you to access data from a JSON API web service via Vuex stores. Because of JSON API's strong conventions, in most cases all you should need to do is tell `vuex-jsonapi` the base URL of your web service, and which resources to access, and you should be set. No manual web request juggling!

This is a very early proof-of-concept, so many features of JSON API are not yet supported. Open a GitHub issue with any other features you'd like to see!

## Installation

```
# npm install --save vuex-jsonapi
```

## Setup

To create a Vuex module corresponding to a resource on the server, call `resourceStore()`:

```javascript
import { Store } from 'vuex';
import { resourceStore } from 'vuex-jsonapi';
import api from './api';

const store = new Store({
  modules: {
    'widgets': resourceStore({
      name: 'widgets',
      httpClient: api,
    }),
  },
});
```

If you are accessing multiple resources, you can use `mapResourceStores()`:

```javascript
import { Store } from 'vuex';
import { mapResourceStores } from 'vuex-jsonapi';
import api from './api';

const store = new Store({
  modules: {
    ...mapResourceStores({
      names: [
        'widgets',
        'purchases',
      ],
      httpClient: api,
    }),
  },
});
```

The `httpClient` accepts an object with a signature similar to the popular Axios HTTP client directory. You can either pass in an Axios client configured with your base URL:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    'Authentication': `Bearer ${token}`,
  },
});

const module = resourceStore({
  name: 'widgets',
  httpClient: api,
})
```

Or else you can pass in an object that exposes the following methods:

```javascript
const api = {
  get(path) {
    // ...
  },
  post(path, body) {
    // ...
  },
  patch(path, body) {
    // ...
  },
  delete(path, body) {
    // ...
  },
};
```

That's all you need to do--the JSON API spec takes care of the rest!

## Usage

Working with JSON API data is split into two parts to follow Vuex conventions:

- **Actions** are used to request data from the server or update data on the server, storing the results into the module's state.
- **Getters** are used to access data from the module's state.

### loadAll action / all getter

So, for example, to retrieve all of the records for a resource, dispatch the `loadAll` action, then access the `all` getter:

```javascript
this.$store.dispatch('widgets/loadAll')
  .then(() => {
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

### loadById action / find getter

To retrieve a single record by ID:

```javascript
this.$store.dispatch('widgets/loadById', { id: 42 })
  .then(() => {
    const widget = this.$store.getters['widgets/find'](42);
    console.log(widget);
  });
```

However, the beauty of storing your data in Vuex is that if you know the record has already been retrieved, you don't need to load it again. For example, if you've loaded all records on a list screen, and then you click to view the details for a single record, you can just use the getter directly:

```javascript
const widget = this.$store.getters['widgets/find'](42);
console.log(widget);
```

### loadBy action / where getter

To filter/query for records based on certain criteria, use the `loadBy` action.

```javascript
const filter = {
  category: 'whizbang',
};
this.$store.dispatch('widgets/loadBy', { filter })
  .then(() => {
    const widget = this.$store.getters['widgets/where'](filter);
    console.log(widget);
  });
```

Note that if your server is doing anything fancy with filtering, the `where` getter will not replicate that logic. In that case, you may want to access the `all` getter and perform filtering yourself.

### loadRelated action / related getter

Finally, to load records related via JSON API relationships, use the `loadRelated` action. The related resource URL is constructed (may need to be more HATEOAS in the future). This ensures the records are downloaded. Then, to display them, use the `related` getter. The record you pass to it needs to include the relationships sideloaded.

```javascript
const categoryId = 27;
const options = {
  include: 'widgets',
};

this.$store.dispatch('categories/find', { id: categoryId, options })
  .then(() => {
    const category = this.$store.getters['categories/find'](categoryId);
    return this.$store.dispatch('widgets/loadRelated', { parent: category });
  })
  .then(() => {
    const widgets = this.$store.getters['widgets/related'](category);
    console.log(widgets);
  });
```

### create

To create records on the server and also store it locally:

```javascript
const recordData = {
  attributes: {
    title: 'My Widget',
  },
};
this.$store.dispatch('widgets/create', recordData);
```

You can also save relationships by providing the object in the JSON API format:

```javascript
const recordData = {
  attributes: {
    title: 'My Widget',
  },
  relationships: {
    category: {
      data: {
        type: 'categories',
        id: 42,
      },
    },
  },
};
this.$store.dispatch('widgets/create', recordData);
```

### update

To update records, pass the entire updated record object to the `update` action:

```javascript
const widget = this.$store.getters['widgets/find'](42);
widget.attributes.title = 'Updated Title';
this.$store.dispatch('widgets/update', widget);
```

### delete

To delete, pass either a full record or just an object with an ID field:

```javascript
const widgetIdObject = { id: 42 };
this.$store.dispatch('widgets/delete', widget);
```

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run all tests
npm test
```

## License

Apache 2.0
