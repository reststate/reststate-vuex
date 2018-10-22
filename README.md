# vuex-jsonapi

[![CircleCI](https://circleci.com/gh/reststate/reststate-vuex.svg?style=svg)](https://circleci.com/gh/reststate/reststate-vuex)

`vuex-jsonapi`, unsurprisingly, allows you to access data from a [JSON API](http://jsonapi.org/) web service via [Vuex](https://vuex.vuejs.org/) stores. Because of JSON API's strong conventions, in most cases all you should need to do is tell `vuex-jsonapi` the base URL of your web service, and which resources to access, and you should be set. No manual web request juggling!

This is a very early proof-of-concept, so many features of JSON API are not yet supported. Open a GitHub issue with any other features you'd like to see!

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

## Installation

```
# npm install --save vuex-jsonapi
```

## Setup

To create a Vuex module corresponding to a resource on the server, call `resourceModule()`:

```javascript
import { Store } from 'vuex';
import { resourceModule } from 'vuex-jsonapi';
import api from './api';

const store = new Store({
  modules: {
    'widgets': resourceModule({
      name: 'widgets',
      httpClient: api,
    }),
  },
});
```

If you are accessing multiple resources, you can use `mapResourceModules()`:

```javascript
import { Store } from 'vuex';
import { mapResourceModules } from 'vuex-jsonapi';
import api from './api';

const store = new Store({
  modules: {
    ...mapResourceModules({
      names: [
        'widgets',
        'purchases',
      ],
      httpClient: api,
    }),
  },
});
```

The `httpClient` accepts an object with a signature similar to the popular [Axios](https://github.com/axios/axios) HTTP client directory. You can either pass in an Axios client configured with your base URL and headers. Note that spec-compliant servers will require a `Content-Type` header of `application/vnd.api+json`; you will need to configure your HTTP client to send that.

```javascript
import axios from 'axios';

const httpClient = axios.create({
  baseURL: 'http://api.example.com/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    'Authentication': `Bearer ${token}`,
  },
});

const module = resourceModule({
  name: 'widgets',
  httpClient,
});
```

Or else you can pass in an object that exposes the following methods:

```javascript
const httpClient = {
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

So, for example, to retrieve all of the records for a resource, dispatch the `loadAll` action to save them into the store. They can then be accessed using `all` getter:

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

### loadById action / byId getter

To retrieve a single record by ID, dispatch the `loadById` action, then access the `byId` getter:

```javascript
this.$store.dispatch('widgets/loadById', { id: 42 })
  .then(() => {
    const widget = this.$store.getters['widgets/byId']({ id: 42 });
    console.log(widget);
  });
```

However, the beauty of storing your data in Vuex is that if you know the record has already been retrieved, you don't need to load it again. For example, if you've loaded all records on a list screen, and then you click to view the details for a single record, you can just use the getter directly:

```javascript
const widget = this.$store.getters['widgets/byId']({ id: 42 });
console.log(widget);
```

### loadWhere action / where getter

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

### loadRelated action / related getter

Finally, to load records related via JSON API relationships, use the `loadRelated` action. A nested resource URL is constructed like `categories/27/widgets`. (In the future we will look into using HATEOAS to let the server tell us the relationship URL).

```javascript
const parent = {
  type: 'category',
  id: 27,
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
  id: 27,
};

const relationship = 'purchased-widgets';

this.$store.dispatch('widgets/loadRelated', { parent, relationship })
  .then(() => {
    const widgets = this.$store.getters['widgets/related']({ parent, relationship });
    console.log(widgets);
  });
```

### create

To create records on the server and also store it locally, use the `create` action. Pass it an object containing an `attributes` object. This is similar to a JSON API record, but you don't need to specify the type -- the store will add the type.

```javascript
const recordData = {
  attributes: {
    title: 'My Widget',
  },
};
this.$store.dispatch('widgets/create', recordData);
```

You can also save relationships by providing a `relationships` attribute, just like in the JSON API spec:

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
const widget = this.$store.getters['widgets/byId']({ id: 42 });
widget.attributes.title = 'Updated Title';
this.$store.dispatch('widgets/update', widget);
```

### delete

To delete, pass either a full record or just an object with an ID field:

```javascript
const widgetIdObject = { id: 42 };
this.$store.dispatch('widgets/delete', widgetIdObject);
```

## License

Apache 2.0
