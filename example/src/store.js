import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { resourceModule } from '@reststate/vuex';

const httpClient = axios.create({
  baseURL: 'https://jsonapi-sandbox.herokuapp.com/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
  },
});

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    widgets: resourceModule({ name: 'widgets', httpClient }),
  },
});
