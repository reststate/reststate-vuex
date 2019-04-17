<template>
  <div>
    <div>
      <button @click="updateSort('username')">Username</button>
      <button @click="updateSort('comment')">Comment</button>
    </div>
    <ul>
      <li
        v-for="comment in comments"
        :key="comment.username"
      >
        <h2>{{ comment.username }}</h2>
        <p>{{ comment.comment }}</p>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'app',
  data() {
    return {
      parentWidgetId: 1,
      sort: 'username',
      currentPage: 1,
      itemsPerPage: 2,
      totalItems: 0,
    };
  },
  mounted() {
    this.loadComments();
  },
  computed: {
    comments() {
      const comments =
        this.$store.getters['widget-comments/related']({
          parent: {
            id: this.parentWidgetId,
            type: 'widgets',
          },
          options: {
            page: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            sort: this.sort,
          },
        }) || [];
      console.log({ comments });
      return comments.map(({ attributes }) => attributes);
    },
  },
  methods: {
    loadComments() {
      this.$store
        .dispatch('widget-comments/loadRelated', {
          parent: {
            id: this.parentWidgetId,
            type: 'widgets',
          },
          options: {
            page: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            sort: this.sort,
          },
        })
        .then(() => {
          const meta = this.$store.getters['widget-comments/lastMeta'] || {};
          this.itemsPerPage = meta.itemsPerPage;
          this.totalItems = meta.totalItems;
        });
    },
    updateSort(sort) {
      this.sort = sort;
      this.loadComments();
    },
  },
};
</script>
