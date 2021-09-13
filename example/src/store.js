import MockAdapter from 'axios-mock-adapter';
import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { resourceModule } from '@lucro/vuex';

const httpClient = axios.create({
  baseURL: 'https://localhost:8081/',
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

// To avoid having to run a separate server
// mock out the one reply we need for this example.
const mock = new MockAdapter(httpClient);

// Mock any GET request to /widgets
// arguments for reply are (status, data, headers)
mock.onGet('/widgets?').reply(200, {
  data:
    [
      {
        type: 'widget',
        id: '1',
        attributes: {
          name: 'First Widget',
        },
      },
      {
        type: 'widget',
        id: '2',
        attributes: {
          name: 'Second Widget',
        },
      },
    ],
});
