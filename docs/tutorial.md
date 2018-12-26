# Tutorial

Let's walk through setting up a zero-configuration data layer in Vue using `@reststate/vuex`.

Create a new Vue app using [Vue CLI 3](https://cli.vuejs.org/). Include Vuex support:

```sh
$ vue create reststate-vuex-tutorial
```

Make sure you include Vuex in the list of features, or choose a preset that includes Vuex.

Next, add `@reststate/vuex`, as well as the `axios` library for handling the web service requests:

```sh
$ yarn add @reststate/vuex axios
```

Next, we want to use `@reststate/vuex` to create a Vuex store module for handling posts. The JSON:API web service we'll be connecting to is [sandboxapi.reststate.org](https://sandboxapi.reststate.org/), a free service that allows you to create an account so you can write data as well as read it. Sign up for an account there.

Next, we need to get a token to authenticate with. We aren't going to build a login form as part of this tutorial. Instead, use a web service client app like [Postman](https://www.getpostman.com/) to send the following request:

```
POST https://sandboxapi.reststate.org/oauth/token

grant_type=password
username=you@yourodmain.com
password=yourpassword
```

You'll receive back a response like:

```json
{
    "access_token": "b027b3ed38739a1d01c2ac05008f0cb4e7a764acc802e0cfb1e5bf1a4876597c",
    "token_type": "bearer",
    "expires_in": 7200,
    "created_at": 1531855327
}
```

Let's set up an `axios` client with that access token to handle the web service connection. Add the following to `src/store.js`:

```javascript
import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { resourceModule } from '@reststate/vuex';

const token = '[the token you received from the POST request above]';

const httpClient = axios.create({
  baseURL: 'https://sandboxapi.reststate.org/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    Authorization: `Bearer ${token}`,
  },
});
```

Now, call `resourceModule()` to create a new module that accesses and stores post data:

```diff
 Vue.use(Vuex);

 export default new Vuex.Store({
+  modules: {
+    posts: resourceModule({ name: 'posts', httpClient }),
+  },
 });
```

That's all we have to do to set up our data layer! Now let's put it to use.

Let's set up a component to display a list of the posts. Replace the content of `App.vue` with the following:

```html
<template>
  <div>
    <ul>
      <li
        v-for="post in allPosts"
        :key="post.id"
      >
        {{ post.attributes.title }}
      </li>
    </ul>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';

export default {
  name: 'app',
  mounted() {
    this.loadAllPosts();
  },
  methods: {
    ...mapActions({
      loadAllPosts: 'posts/loadAll',
    }),
  },
  computed: {
    ...mapGetters({
      allPosts: 'posts/all',
    }),
  },
};
</script>
```

Notice a few things:

- We use Vuex's `mapActions` and `mapGetters` as usual to access the actions and getters.
- We use a `loadAll` action to request the data from the server in the `mounted` hook.
- We use an `all` getter to access the data for rendering.
- The post's ID is available as a property on the `post` directly, but its title is under a `post.attributes` object. This is the standard JSON:API resource object format, and to keep things simple `@reststate/vuex` exposes resources in the same format as JSON:API.

Run the app and you'll see some sample posts that were created by default for you when you signed up for a Sandbox API account.

A nice enhancement we could do would be to show the user when the data is loading from the server, or if it has errored out. Our store has properties for this. Map a few more getters:

```diff
     ...mapGetters({
+      loading: 'posts/loading',
+      error: 'posts/error',
       allPosts: 'posts/all',
     }),
```

Next, let's check these variables in the template:

```diff
 <template>
   <div>
-    <ul>
+    <p v-if="loading">Loading...</p>
+    <p v-else-if="error">Error loading posts.</p>
+    <ul v-else>
       <li
         v-for="post in allPosts"
```

Now reload the page and you should briefly see the "Loading" message before the data loads. If you'd like to see the error message, change the `baseURL` in `store.js` to some incorrect URL, and the request to load the data will error out.

Now that we've set up reading our data, let's see how we can write data. Let's allow the user to create a new post. To keep things simple for the example, we'll just save a title field.

Add a simple form to the top of the template:

```diff
 <template>
   <div>
+    <form @submit.prevent="handleCreate">
+      <input
+        type="text"
+        v-model="title"
+      />
+      <button>Create</button>
+    </form>
     <p v-if="loading">Loading...</p>
```

Now, add a data property for the `title`:

```diff
 export default {
   name: 'app',
+  data() {
+    return {
+      title: '',
+    };
+  },
   mounted() {
```

Map the `create` action:

```diff
   methods: {
     ...mapActions({
       loadAllPosts: 'posts/loadAll',
+      createPost: 'posts/create',
     }),
```

And add a custom `handleCreate` method:

```diff
       loadAllPosts: 'posts/loadAll',
       createPost: 'posts/create',
     }),
+    handleCreate() {
+      this.createPost({
+        attributes: {
+          title: this.title,
+        },
+      }).then(() => {
+        this.title = '';
+      });
+    },
```

Notice a few things:

- The object we pass to `createPost` follows the JSON:API resource object format: the attributes are under an `attributes` object. (If you know JSON:API, you may notice that we aren't passing a `type` property, though--`@reststate/vuex` can infer that from the fact that we're in the `posts` module.)
- We clear out the title after the `create` operation succeeds.

Run the app and you should be able to submit a new post, and it should appear in the list right away. This is because `@reststate/vuex` automatically adds it to the local store of posts; you don't need to do that manually.

Finally, let's make a way to delete posts. Add a delete button to each list item:

```diff
         :key="post.id"
       >
         {{ post.attributes.title }}
+        <button @click="deletePost(post)">
+          Delete
+        </button>
       </li>
```

Map the `delete` action:

```diff
     ...mapActions({
       loadAllPosts: 'posts/loadAll',
       createPost: 'posts/create',
+      deletePost: 'posts/delete',
     }),
```

This time we don't need a custom method; we can just bind the action directly with `@click`. Try it out and you can delete records from your list. They're removed from the server and from your local Vuex store.

With that, our tutorial is complete. Notice how much functionality we got without needing to write any custom store code! JSON:API's conventions allow us to use a zero-configuration library like `@reststate/vuex`  to focus on our application and not on managing data.
