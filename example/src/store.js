import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { resourceModule } from '@reststate/vuex';

const token = process.env.VUE_APP_API_TOKEN;

const httpClient = axios.create({
  baseURL: 'https://sandboxapi.reststate.org/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    Authorization: `Bearer ${token}`,
  },
});

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    posts: resourceModule({ name: 'posts', httpClient }),
  },
});
