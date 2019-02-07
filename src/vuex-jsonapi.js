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

const handleError = commit => error => {
  commit('SET_STATUS', STATUS_ERROR);
  throw error;
};

const resourceModule = ({ name: resourceName, httpClient }) => {
  const client = new ResourceClient({ name: resourceName, httpClient });

  return {
    namespaced: true,

    state: {
      records: [],
      related: [],
      filtered: [],
      page: [],
      status: STATUS_INITIAL,
      links: {},
    },

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

      REMOVE_RECORD: (state, record) => {
        state.records = state.records.filter(r => r.id !== record.id);
      },

      SET_LINKS: (state, links) => {
        state.links = links || {};
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
          })
          .catch(handleError(commit));
      },

      create({ commit }, recordData) {
        return client.create(recordData).then(result => {
          commit('STORE_RECORD', result.data);
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
    },

    getters: {
      loading: state => state.status === STATUS_LOADING,
      error: state => state.status === STATUS_ERROR,
      hasPrevious: state => !!state.links.prev,
      hasNext: state => !!state.links.next,
      all: state => state.records,
      byId: state => ({ id }) => state.records.find(r => r.id === id),
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
