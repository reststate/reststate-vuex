import { ResourceClient } from '@reststate/client';
import deepEquals from './deepEquals';

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

const getResourceIdentifier = resource => {
  if (!resource) {
    return resource;
  }

  return {
    type: resource.type,
    id: resource.id,
  };
};

const getRelationshipType = relationship => {
  const data = Array.isArray(relationship.data)
    ? relationship.data[0]
    : relationship.data;

  return data && data.type;
};

const storeIncluded = ({ commit, dispatch }, result) => {
  if (result.included) {
    // store the included records
    result.included.forEach(relatedRecord => {
      const action = `${relatedRecord.type}/storeRecord`;
      dispatch(action, relatedRecord, { root: true });
    });

    // store the relationship for primary and secondary records
    let allRecords = [...result.included];
    if (Array.isArray(result.data)) {
      allRecords = [...allRecords, ...result.data];
    } else {
      allRecords = [...allRecords, result.data];
    }

    allRecords.forEach(primaryRecord => {
      if (primaryRecord.relationships) {
        Object.keys(primaryRecord.relationships).forEach(relationshipName => {
          const relationship = primaryRecord.relationships[relationshipName];
          if (!relationship.data || relationship.data.length === 0) {
            return;
          }

          const type = getRelationshipType(relationship);
          let relatedIds;
          if (Array.isArray(relationship.data)) {
            relatedIds = relationship.data.map(
              relatedRecord => relatedRecord.id,
            );
          } else {
            ({ id: relatedIds } = relationship.data);
          }
          const options = {
            relatedIds,
            params: {
              parent: getResourceIdentifier(primaryRecord),
              relationship: relationshipName,
            },
          };
          const action = `${type}/storeRelated`;
          dispatch(action, options, { root: true });
        });
      }
    });
  }
};

const matches = criteria => test =>
  Object.keys(criteria).every(key => deepEquals(criteria[key], test[key]));

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

  const getRelationshipIndex = params => {
    const { parent, relationship = resourceName } = params;
    const parentResourceIdentifier = getResourceIdentifier(parent);

    return {
      parent: parentResourceIdentifier,
      relationship,
    };
  };

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

      STORE_RELATED: (state, { relatedIds, params }) => {
        const { related } = state;
        const relationshipIndex = getRelationshipIndex(params);
        const existingRecord = related.find(matches(relationshipIndex));
        if (existingRecord) {
          existingRecord.relatedIds = relatedIds;
        } else {
          related.push(Object.assign({ relatedIds }, relationshipIndex));
        }
      },

      STORE_FILTERED: (state, { matchedIds, params }) => {
        const { filtered } = state;

        const existingRecord = filtered.find(matches(params));
        if (existingRecord) {
          existingRecord.matchedIds = matchedIds;
        } else {
          filtered.push(Object.assign({ matchedIds }, params));
        }
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
      loadAll({ commit, dispatch }, { options } = {}) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .all({ options })
          .then(result => {
            commit('SET_STATUS', STATUS_SUCCESS);
            commit('REPLACE_ALL_RECORDS', result.data);
            commit('STORE_META', result.meta);
            storeIncluded({ commit, dispatch }, result);
          })
          .catch(handleError(commit));
      },

      loadById({ commit, dispatch }, { id, options }) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .find({ id, options })
          .then(results => {
            commit('SET_STATUS', STATUS_SUCCESS);
            commit('STORE_RECORD', results.data);
            commit('STORE_META', results.meta);
            storeIncluded({ commit, dispatch }, results);
          })
          .catch(handleError(commit));
      },

      loadWhere({ commit, dispatch }, params) {
        const { filter, options } = params;
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .where({ filter, options })
          .then(results => {
            commit('SET_STATUS', STATUS_SUCCESS);
            const matches = results.data;
            const matchedIds = matches.map(record => record.id);
            commit('STORE_RECORDS', matches);
            commit('STORE_FILTERED', { params, matchedIds });
            commit('STORE_META', results.meta);
            storeIncluded({ commit, dispatch }, results);
          })
          .catch(handleError(commit));
      },

      loadPage({ commit, dispatch }, { options }) {
        commit('SET_STATUS', STATUS_LOADING);
        return client
          .all({ options })
          .then(response => {
            commit('SET_STATUS', STATUS_SUCCESS);
            commit('STORE_RECORDS', response.data);
            commit('STORE_PAGE', response.data);
            commit('STORE_META', response.meta);
            commit('SET_LINKS', response.links);
            storeIncluded({ commit, dispatch }, response);
          })
          .catch(handleError(commit));
      },

      loadNextPage({ commit, state, dispatch }) {
        const options = {
          url: state.links.next,
        };
        return client.all({ options }).then(response => {
          commit('STORE_RECORDS', response.data);
          commit('STORE_PAGE', response.data);
          commit('SET_LINKS', response.links);
          commit('STORE_META', response.meta);
          storeIncluded({ commit, dispatch }, response);
        });
      },

      loadPreviousPage({ commit, state, dispatch }) {
        const options = {
          url: state.links.prev,
        };
        return client.all({ options }).then(response => {
          commit('STORE_RECORDS', response.data);
          commit('STORE_PAGE', response.data);
          commit('SET_LINKS', response.links);
          commit('STORE_META', response.meta);
          storeIncluded({ commit, dispatch }, response);
        });
      },

      loadRelated({ commit, dispatch }, params) {
        const { parent, relationship = resourceName, options } = params;
        commit('SET_STATUS', STATUS_LOADING);
        const paramsToStore = {
          ...params,
          relationship,
        };
        return client
          .related({ parent, relationship, options })
          .then(results => {
            commit('SET_STATUS', STATUS_SUCCESS);
            const { id, type } = parent;
            if (Array.isArray(results.data)) {
              const relatedRecords = results.data;
              const relatedIds = relatedRecords.map(record => record.id);
              commit('STORE_RECORDS', relatedRecords);
              commit('STORE_RELATED', { params: paramsToStore, relatedIds });
            } else {
              const record = results.data;
              const relatedIds = record.id;
              commit('STORE_RECORDS', [record]);
              commit('STORE_RELATED', { params: paramsToStore, relatedIds });
            }
            commit('STORE_META', results.meta);
            storeIncluded({ commit, dispatch }, results);
          })
          .catch(handleError(commit));
      },

      create({ commit }, recordData) {
        return client.create(recordData).then(result => {
          commit('STORE_RECORD', result.data);
          commit('STORE_LAST_CREATED', result.data);
        });
      },

      update({ commit, dispatch, getters }, record) {
        return client.update(record).then(() => {
          const oldRecord = getters.byId({ id: record.id });

          // remove old relationships first
          if (oldRecord && oldRecord.relationships) {
            for (const entry of Object.entries(oldRecord.relationships)) {
              const [relationship, entity] = entry;
              const type = getRelationshipType(entity);
              const paramsToStore = {
                relationship,
                parent: getResourceIdentifier(oldRecord),
              };

              dispatch(
                `${type}/storeRelated`,
                {
                  params: paramsToStore,
                  relatedIds: null,
                },
                { root: true },
              );
            }
          }

          // save entity
          commit('STORE_RECORD', record);

          // set new relationships
          if (record.relationships) {
            for (const relationship of Object.keys(record.relationships)) {
              const relationshipObject = record.relationships[relationship];
              const { data } = relationshipObject;
              const isNonEmptyArray =
                Array.isArray(data) && Boolean(data.length);
              const isObject = Boolean(data && data.type && data.id);

              if (isNonEmptyArray || isObject) {
                const paramsToStore = {
                  parent: getResourceIdentifier(record),
                  relationship,
                };
                const type = getRelationshipType(relationshipObject);
                let relatedIds;
                if (Array.isArray(data)) {
                  relatedIds = data.map(record => record.id);
                } else {
                  relatedIds = data.id;
                }
                dispatch(
                  `${type}/storeRelated`,
                  {
                    params: paramsToStore,
                    relatedIds,
                  },
                  { root: true },
                );
              }
            }
          }
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

      storeRelated({ commit }, { relatedIds, params }) {
        commit('STORE_RELATED', {
          relatedIds,
          params,
        });
      },

      removeRecord({ commit }, record) {
        commit('REMOVE_RECORD', record);
      },

      resetState({ commit }) {
        commit('RESET_STATE');
      },

      addRelated({ commit, getters }, params) {
        const { parent, relationship = resourceName, data } = params;
        const relatedItems = getters.related(params).map(o => o.id);
        const difference = data.filter(x => !relatedItems.includes(x));
        const records = difference.map(id => {
          return { type: relationship, id };
        });
        return client.createRelationships(parent, relationship, records);
      },

      setRelated({ commit, dispatch }, params) {
        const { parent, relationship = resourceName, data } = params;
        client.updateRelationships(parent, relationship, data);
        let relatedIds;
        if (Array.isArray(data)) {
          relatedIds = data.map(record => record.id);
        } else {
          relatedIds = data.id;
        }
        commit('STORE_RELATED', {
          params: { parent, relationship },
          relatedIds,
        });
      },

      removeRelated({ commit, dispatch }, params) {
        const { parent, relationship = resourceName, data } = params;
        client.removeRelationships(parent, relationship, data);
        if (Array.isArray(data)) {
          relatedIds = data.map(record => record.id);
        } else {
          relatedIds = data.id;
        }
        commit('REMOVE_RELATED', {
          params: { parent, relationship },
          relatedIds,
        });
      },

      removeAllRelated({ commit, dispatch }, params) {
        const { parent, relationship = resourceName } = params;
        client.updateRelationships(parent, relationship, []);
        commit('REMOVE_RELATED', {
          params: { parent, relationship },
          relatedIds: [],
        });
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
        state.page.map(id => state.records.find(record => record.id === id)),
      where: state => params => {
        const entry = state.filtered.find(matches(params));

        if (!entry) {
          return [];
        }

        const ids = entry.matchedIds;
        return ids.map(id => state.records.find(record => record.id === id));
      },
      related: state => params => {
        const relationshipIndex = getRelationshipIndex(params);
        const related = state.related.find(matches(relationshipIndex));

        if (!related) {
          return null;
        } else if (Array.isArray(related.relatedIds)) {
          const ids = related.relatedIds;
          return ids
            .map(id => state.records.find(record => record.id === id))
            .filter(record => record !== undefined);
        } else {
          const id = related.relatedIds;
          return state.records.find(record => id === record.id);
        }
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
