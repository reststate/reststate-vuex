# Tutorial

Let's walk through setting up a zero-configuration data layer in Vue using `@reststate/vuex`. To try it out, let's create a webapp for rating dishes at restaurants. We'll call it "Opinion Ate".

Create a new Vue app using [Vue CLI 3](https://cli.vuejs.org/):

```sh
$ npm install -g @vue/cli
$ vue create opinion-ate-vue
$ cd opinion-ate-vue
```

Make sure you include Router and Vuex in the list of features. You can answer "Yes" for "Use history mode for router?"

Next, add `@reststate/vuex`, as well as the `axios` library for handling the web service requests:

```sh
$ yarn add @reststate/vuex axios
```

Next, we want to use `@reststate/vuex` to create Vuex store modules for handling restaurants and dishes. The JSON:API web service we'll be connecting to is [jsonapi-sandbox.herokuapp.com](https://jsonapi-sandbox.herokuapp.com/), a free service that allows you to create an account so you can write data as well as read it. Sign up for an account there.

Next, we need to get a token to authenticate with. We aren't going to build a login form as part of this tutorial. Instead, use a web service client app like [Postman](https://www.getpostman.com/) to send the following request:

```
POST https://jsonapi-sandbox.herokuapp.com/oauth/token

grant_type=password
username=you@yourdomain.com
password=yourpassword
```

You'll receive back a response like:

```json
{
  "access_token": "Hhd07mqAY1QlhoinAcKMB5zlmRiatjOh5Ainh90yWPI",
  "token_type": "bearer",
  "created_at": 1531855327
}
```

Let's set up an `axios` client with that access token to handle the web service connection. Add the following to `src/store/index.js`:

```javascript
import axios from 'axios';
import { mapResourceModules } from '@reststate/vuex';

const token = '[the token you received from the POST request above]';

const httpClient = axios.create({
  baseURL: 'https://jsonapi-sandbox.herokuapp.com/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    Authorization: `Bearer ${token}`,
  },
});
```

Now, call `mapResourceModules()` to create two new modules, for accessing restaurant and dish data. You can remove the existing properties of the options object:

```diff
 Vue.use(Vuex);

 export default new Vuex.Store({
-  state: {},
-  mutations: {},
-  actions: {},
-  modules: {}
+  modules: {
+    ...mapResourceModules({
+      httpClient,
+      names: ['restaurants', 'dishes'],
+    })
+  },
 });
```

That's all we have to do to set up our data layer! Now let's put it to use.

Let's set up the index route to display a list of the restaurants.

First, delete the `<style>` tag from `App.vue` to remove the default styling.

Then, replace the content of `src/views/Home.vue` with the following:

```html
<template>
  <div>
    <ul>
      <li v-for="restaurant in allRestaurants" :key="restaurant.id">
        {{ restaurant.attributes.name }}
      </li>
    </ul>
  </div>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';

  export default {
    name: 'home',
    mounted() {
      this.loadAllRestaurants();
    },
    methods: {
      ...mapActions({
        loadAllRestaurants: 'restaurants/loadAll',
      }),
    },
    computed: {
      ...mapGetters({
        allRestaurants: 'restaurants/all',
      }),
    },
  };
</script>
```

Notice a few things:

- We use Vuex's `mapActions` and `mapGetters` as usual to access the actions and getters.
- We use a `loadAll` action to request the data from the server in the `mounted` hook.
- We use an `all` getter to access the data for rendering.
- The restaurant's ID is available as a property on the `restaurant` directly, but its name is under a `post.attributes` object. This is the standard JSON:API resource object format, and to keep things simple `@reststate/vuex` exposes resources in the same format as JSON:API.

Start the app:

```sh
$ yarn serve
```

Visit `http://localhost:8080` in your browser and you'll see some sample restaurants that were created by default for you when you signed up for a Sandbox API account.

A nice enhancement we could do would be to show the user when the data is loading from the server, or if it has errored out. Our store has properties for this. Map a few more getters:

```diff
     ...mapGetters({
+      isLoading: 'restaurants/isLoading',
+      isError: 'restaurants/isError',
       allRestaurants: 'restaurants/all',
     }),
```

Next, let's check these variables in the template:

```diff
 <template>
   <div>
-    <ul>
+    <p v-if="isLoading">Loading...</p>
+    <p v-else-if="isError">Error loading restaurants.</p>
+    <ul v-else>
       <li
         v-for="restaurant in allRestaurants"
```

Now reload the page and you should briefly see the "Loading" message before the data loads. If you'd like to see the error message, change the `baseURL` in `store/index.js` to some incorrect URL, and the request to load the data will error out.

Now that we've set up reading our data, let's see how we can write data. Let's allow the user to create a new restaurant.

Add a simple form to the top of the template:

```diff
 <template>
   <div>
+    <form @submit.prevent="handleCreate">
+      <div>
+        Name:
+        <input type="text" v-model="name" />
+      </div>
+      <div>
+        Address:
+        <input type="text" v-model="address" />
+      </div>
+      <button>Create</button>
+    </form>
     <p v-if="isLoading">Loading...</p>
```

Now, add data properties for the `name` and `address` fields:

```diff
 export default {
   name: 'home',
+  data() {
+    return {
+      name: '',
+      address: '',
+    };
+  },
   mounted() {
```

Map the `create` action:

```diff
   methods: {
     ...mapActions({
       loadAllRestaurants: 'restaurants/loadAll',
+      createRestaurant: 'restaurants/create',
     }),
```

And add a custom `handleCreate` method:

```diff
       loadAllRestaurants: 'restaurants/loadAll',
       createRestaurant: 'restaurants/create',
     }),
+    handleCreate() {
+      this.createRestaurant({
+        attributes: {
+          name: this.name,
+          address: this.address,
+        },
+      }).then(() => {
+        this.name = '';
+        this.address = '';
+      });
+    },
```

Notice a few things:

- The object we pass to `createRestaurant` follows the JSON:API resource object format: the attributes are under an `attributes` object. (If you know JSON:API, you may notice that we aren't passing a `type` property, though--`@reststate/vuex` can infer that from the fact that we're in the `restaurants` module.)
- We clear out the name and address after the `create` operation succeeds, which clears the form.

Run the app and you should be able to submit a new restaurant, and it should appear in the list right away. This is because `@reststate/vuex` automatically adds it to the local store of restaurants; you don't need to do that manually.

Next, let's make a way to delete restaurants. Add a delete button to each list item:

```diff
         :key="restaurant.id"
       >
         {{ restaurant.attributes.name }}
+        <button @click="deleteRestaurant(restaurant)">
+          Delete
+        </button>
       </li>
```

Map the `delete` action:

```diff
     ...mapActions({
       loadAllRestaurants: 'restaurants/loadAll',
       createRestaurant: 'restaurants/create',
+      deleteRestaurant: 'restaurants/delete',
     }),
```

This time we don't need a custom method; we can just bind the action directly with `@click`. Try it out and you can delete records from your list. They're removed from the server and from your local Vuex store.

Let's wrap things up by showing how you can load related data: the dishes for each restaurant.

In `src/router.js`, add a new route to point to a restaurant detail view:

```diff
 import Home from './views/Home.vue'
+import RestaurantDetail from './views/RestaurantDetail.vue'
...
   component: Home
 },
+{
+  path: '/restaurants/:id',
+  name: 'restaurant-detail',
+  component: RestaurantDetail
+},
 {
```

Create a new `src/views/RestuarantDetail.vue` file for this component and start with the following:

```html
<script>
  import { mapActions, mapGetters } from "vuex";

  export default {
    name: 'restaurant-detail',
    methods: {
    computed: {
    }
  };
</script>
```

First let's retrieve the restaurant ID from the route:

```diff
 computed: {
+  restaurantId() {
+    return this.$route.params.id;
+  },
 }
```

Then let's use that ID to load the restaurant with that ID when the component mounts:

```diff
 export default {
   name: 'restaurant-detail',
+  async mounted() {
+    await this.loadRestaurant({ id: this.restaurantId });
+  },
   methods: {
+    ...mapActions({
+      loadRestaurant: 'restaurants/loadById',
+    })
   },
```

Then let's make that loaded restaurant easily available as a computed property:

```diff
   restaurantId() {
     return this.$route.params.id;
   },
+  restaurant() {
+    return this.restaurantById({ id: this.restaurantId });
+  },
 }
```

Now we can access that restaurant in the template:

```html
<template>
  <div v-if="restaurant">
    <h1>{{ restaurant.attributes.name }}</h1>
  </div>
</template>
```

Now to load the dishes related to the restaurant, we'll follow fairly analogus steps.

After we load the restaurant, we load its related dishes as well:

```diff
 export default {
   name: 'restaurant-detail',
   async mounted() {
     await this.loadRestaurant({ id: this.restaurantId });
+    await this.loadRelatedDishes({ parent: this.restaurant });
   },
   methods: {
     ...mapActions({
       loadRestaurant: 'restaurants/loadById',
+      loadRelatedDishes: 'dishes/loadRelated',
     })
   },
```

Then we make that loaded dishes easily available as a computed property:

```diff
 computed: {
   ...mapGetters({
     restaurantById: 'restaurants/byId',
+    relatedDishes: 'dishes/related',
   }),
...
   restaurant() {
     return this.restaurantById({ id: this.restaurantId });
   },
+  dishes() {
+    return this.relatedDishes({ parent: this.restaurant });
+  }
 }
```

Now we add those dishes to the template:

```html
<ul>
  <li v-for="dish in dishes" :key="dish.id">
    {{ dish.attributes.name }} - {{ dish.attributes.rating }} stars
  </li>
</ul>
```

Finally, let's link each restaurant in the list to its detail page:

```diff
{% raw %} <li>
-  {{ restaurant.attributes.name }}
+  <router-link :to="`/restaurants/${restaurant.id}`">
+    {{ restaurant.attributes.name }}
+  </router-link>
   <button
     type="button"{% endraw %}
```

Go back to the root of the app and click a link to go to a restauant detail page. You should see the dishes related to that restauant.

With that, our tutorial is complete. Notice how much functionality we got without needing to write any custom store code! JSON:API's conventions allow us to use a zero-configuration library like `@reststate/vuex` to focus on our application and not on managing data.
