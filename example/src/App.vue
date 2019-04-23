<template>
  <div>
    <p v-if="isLoading">Loading...</p>
    <p v-else-if="isError">Error loading widgets</p>
    <ul v-else>
      <li
        v-for="widget in allWidgets"
        :key="widget.id"
      >
        {{ widget.attributes.name }}
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
    this.loadAllWidgets();
  },
  methods: {
    ...mapActions({
      loadAllWidgets: 'widgets/loadAll',
    }),
  },
  computed: {
    ...mapGetters({
      isLoading: 'widgets/isLoading',
      isError: 'widgets/isError',
      error: 'widgets/error',
      allWidgets: 'widgets/all',
    }),
  },
};
</script>
