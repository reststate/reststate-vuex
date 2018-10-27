<template>
  <div>
    <form @submit.prevent="handleCreate">
      <input
        type="text"
        v-model="title"
      />
      <button>Create</button>
    </form>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error loading posts.</p>
    <ul v-else>
      <li
        v-for="post in allPosts"
        :key="post.id"
      >
        {{ post.attributes.title }}
        <button @click="deletePost(post)">
          Delete
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';

export default {
  name: 'app',
  data() {
    return {
      title: '',
    };
  },
  mounted() {
    this.loadAllPosts();
  },
  methods: {
    ...mapActions({
      loadAllPosts: 'posts/loadAll',
      createPost: 'posts/create',
      deletePost: 'posts/delete',
    }),
    handleCreate() {
      this.createPost({
        attributes: {
          title: this.title,
        },
      }).then(() => {
        this.title = '';
      });
    },
  },
  computed: {
    ...mapGetters({
      loading: 'posts/loading',
      error: 'posts/error',
      allPosts: 'posts/all',
    }),
  },
};
</script>
