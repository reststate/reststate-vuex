import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { resourceModule } from '@reststate/vuex';

const httpClient = axios.create({
  baseURL: 'https://sandbox.howtojsonapi.com/',
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
