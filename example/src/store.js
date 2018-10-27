import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { resourceModule } from '@reststate/vuex';

const token =
  'caeff36e945a13e4f26a19f8de4430360eb94bc34ec8409a2871f0f596e9d0a7';

const httpClient = axios.create({
  baseURL: 'https://sandboxapi.codingitwrong.com/',
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
