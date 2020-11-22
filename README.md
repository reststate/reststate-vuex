# @reststate/vuex

**This package is no longer maintained.**

`@reststate/vuex` allows you to access data from a [JSON:API](http://jsonapi.org/) web service via [Vuex](https://vuex.vuejs.org/) stores. Because of JSON:API's strong conventions, in most cases all you should need to do is tell `@reststate/vuex` the base URL of your web service, and which resources to access, and you should be set. No manual web request juggling!

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
# npm install --save @reststate/vuex
```

## Setup

To create a Vuex module corresponding to a resource on the server, call `resourceModule()`:

```javascript
import { Store } from 'vuex';
import { resourceModule } from '@reststate/vuex';
import api from './api';

const store = new Store({
  modules: {
    widgets: resourceModule({
      name: 'widgets',
      httpClient: api,
    }),
  },
});
```

If you are accessing multiple resources, you can use `mapResourceModules()`:

```javascript
import { Store } from 'vuex';
import { mapResourceModules } from '@reststate/vuex';
import api from './api';

const store = new Store({
  modules: {
    ...mapResourceModules({
      names: ['widgets', 'purchases'],
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
    Authentication: `Bearer ${token}`,
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

That's all you need to do--the JSON:API spec takes care of the rest!

## Usage

For more information on usage, see the [`@reststate/vuex` docs](https://vuex.reststate.codingitwrong.com).

## License

Apache 2.0
