import { ResourceClient } from '@reststate/client';

const STATUS_INITIAL = 'INITIAL';
const STATUS_LOADING = 'LOADING';
const STATUS_ERROR = 'ERROR';
const STATUS_SUCCESS = 'SUCCESS';

const storeRecord = records => newRecord => {
  const existingRecord = records.find(r => r.id === newRecord.id);
  if (existingRecord) {
    Object.assign(existingRecord, newRecord);
  } else {
    records.push(newRecord);
  }
};

const matches = criteria => test =>
  Object.keys(criteria).every(key => criteria[key] === test[key]);

const handleError = commit => errorResponse => {
  commit('SET_STATUS', STATUS_ERROR);
  commit('STORE_ERROR', errorResponse);
  throw errorResponse;
};

const initialState = () => ({
  records: [],
  related: [],
  filtered: [],
  page: [],
  error: null,
  status: STATUS_INITIAL,
  links: {},
  lastCreated: null,
  lastMeta: null,
});

const resourceModule = ({ name: resourceName, httpClient }) => {
  const client = new ResourceClient({ name: resourceName, httpClient });

  return {
    namespaced: true,

    state: initialState,

    mutations: {
      REPLACE_ALL_RECORDS: (state, records) => {
        state.records = records;
      },

      REPLACE_ALL_RELATED: (state, related) => {
        state.related = related;
      },

      SET_STATUS: (state, status) => {
        state.status = status;
      },

      STORE_RECORD: (state, newRecord) => {
        const { records } = state;

        storeRecord(records)(newRecord);
      },

      STORE_RECORDS: (state, newRecords) => {
        const { records } = state;

        newRecords.forEach(storeRecord(records));
      },

      STORE_PAGE: (state, records) => {
        state.page = records.map(({ id }) => id);
      },

      STORE_META: (state, meta) => {
        state.lastMeta = meta;
      },

      STORE_ERROR: (state, error) => {
        state.error = error;
      },

      STORE_RELATED: (state, parent) => {
        const { related } = state;

        storeRecord(related)(parent);
      },

      STORE_FILTERED: (state, { filter, matches }) => {
        const { filtered } = state;

        const ids = matches.map(({ id }) => id);

        // TODO: handle overwriting existing one
        filtered.push({ filter, ids });
      },

      STORE_LAST_CREATED: (state, record) => {
        state.lastCreated = record;
      },

      REMOVE_RECORD: (state, record) => {
        state.records = state.records.filter(r => r.id !== record.id);
      },

      SET_LINKS: (state, links) => {
        state.links = links || {};
      },

      RESET_STATE: state => {
        Object.assign(state, initialState());
      },
    },

    actions: {
      loadAll({ commit }, { options } = {}) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .all({ options })
          .then(result => {
            commit('SET_STATUS', STATUS_SUCCESS);
            commit('REPLACE_ALL_RECORDS', result.data);
            commit('STORE_META', result.meta);
          })
          .catch(handleError(commit));
      },

      loadById({ commit }, { id, options }) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .find({ id, options })
          .then(results => {
            commit('SET_STATUS', STATUS_SUCCESS);
            commit('STORE_RECORD', results.data);
            commit('STORE_META', results.meta);
          })
          .catch(handleError(commit));
      },

      loadWhere({ commit }, { filter, options }) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .where({ filter, options })
          .then(results => {
            commit('SET_STATUS', STATUS_SUCCESS);
            const matches = results.data;
            commit('STORE_RECORDS', matches);
            commit('STORE_FILTERED', { filter, matches });
            commit('STORE_META', results.meta);
          })
          .catch(handleError(commit));
      },

      loadPage({ commit }, { options }) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .all({ options })
          .then(response => {
            commit('SET_STATUS', STATUS_SUCCESS);
            commit('STORE_RECORDS', response.data);
            commit('STORE_PAGE', response.data);
            commit('STORE_META', response.meta);
            commit('SET_LINKS', response.links);
          })
          .catch(handleError(commit));
      },

      loadNextPage({ commit, state }) {
        const options = {
          url: state.links.next,
        };
        return client.all({ options }).then(response => {
          commit('STORE_RECORDS', response.data);
          commit('STORE_PAGE', response.data);
          commit('SET_LINKS', response.links);
          commit('STORE_META', response.meta);
        });
      },

      loadPreviousPage({ commit, state }) {
        const options = {
          url: state.links.prev,
        };
        return client.all({ options }).then(response => {
          commit('STORE_RECORDS', response.data);
          commit('STORE_PAGE', response.data);
          commit('SET_LINKS', response.links);
          commit('STORE_META', response.meta);
        });
      },

      loadRelated(
        { commit },
        { parent, relationship = resourceName, options },
      ) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .related({ parent, relationship, options })
          .then(results => {
            commit('SET_STATUS', STATUS_SUCCESS);
            const { id, type } = parent;
            const relatedRecords = results.data;
            const relatedIds = relatedRecords.map(record => record.id);
            commit('STORE_RECORDS', relatedRecords);
            commit('STORE_RELATED', { id, type, relatedIds });
            commit('STORE_META', results.meta);
          })
          .catch(handleError(commit));
      },

      create({ commit }, recordData) {
        return client.create(recordData).then(result => {
          commit('STORE_RECORD', result.data);
          commit('STORE_LAST_CREATED', result.data);
        });
      },

      update({ commit }, record) {
        return client.update(record).then(() => {
          commit('STORE_RECORD', record);
        });
      },

      delete({ commit }, record) {
        return client.delete(record).then(() => {
          commit('REMOVE_RECORD', record);
        });
      },

      storeRecord({ commit }, record) {
        commit('STORE_RECORD', record);
      },

      removeRecord({ commit }, record) {
        commit('REMOVE_RECORD', record);
      },

      resetState({ commit }) {
        commit('RESET_STATE');
      },
    },

    getters: {
      isLoading: state => state.status === STATUS_LOADING,
      isError: state => state.status === STATUS_ERROR,
      error: state => state.error,
      hasPrevious: state => !!state.links.prev,
      hasNext: state => !!state.links.next,
      all: state => state.records,
      lastCreated: state => state.lastCreated,
      byId: state => ({ id }) => state.records.find(r => r.id == id),
      lastMeta: state => state.lastMeta,
      page: state =>
        state.records.filter(record => state.page.includes(record.id)),
      where: state => ({ filter }) => {
        const matchesRequestedFilter = matches(filter);
        const entry = state.filtered.find(({ filter: testFilter }) =>
          matchesRequestedFilter(testFilter),
        );

        if (!entry) {
          return [];
        }

        const { ids } = entry;
        return state.records.filter(record => ids.includes(record.id));
      },
      related: state => ({ parent, relationship = resourceName }) => {
        const { type, id } = parent;
        const related = state.related.find(matches({ type, id }));

        if (!related) {
          return [];
        }

        const ids = related.relatedIds;
        return state.records.filter(record => ids.includes(record.id));
      },
    },
  };
};

const mapResourceModules = ({ names, httpClient }) =>
  names.reduce(
    (acc, name) =>
      Object.assign({ [name]: resourceModule({ name, httpClient }) }, acc),
    {},
  );

export { resourceModule, mapResourceModules };
