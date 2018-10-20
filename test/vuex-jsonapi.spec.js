import Vue from 'vue';
import Vuex from 'vuex';
import { resourceModule } from '../src/vuex-jsonapi';

Vue.use(Vuex);

describe('resourceModule()', () => {
  let store;
  let api;

  beforeEach(() => {
    api = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const storeConfig = resourceModule({
      name: 'widgets',
      httpClient: api,
    });
    store = new Vuex.Store({
      ...storeConfig,
      state: {
        records: [], // TODO find some nicer way to clone this
        related: [],
        filtered: [],
        loading: false,
        error: false,
      },
    });
  });

  describe('loading from the server', () => {
    describe('all records', () => {
      describe('with no options', () => {
        beforeEach(() => {
          api.get.mockResolvedValue({
            data: {
              data: [
                {
                  type: 'widget',
                  id: '1',
                  attributes: {
                    title: 'Foo',
                  },
                },
                {
                  type: 'widget',
                  id: '2',
                  attributes: {
                    title: 'Bar',
                  },
                },
              ],
            },
          });

          return store.dispatch('loadAll');
        });

        it('sets loading to false', () => {
          expect(store.getters.loading).toEqual(false);
        });

        it('makes the records accessible via getter', () => {
          const records = store.getters.all;

          expect(records.length).toEqual(2);

          const firstRecord = records[0];
          expect(firstRecord.id).toEqual('1');
          expect(firstRecord.attributes.title).toEqual('Foo');
        });
      });

      describe('with related records', () => {
        it('returns the records', () => {
          api.get.mockResolvedValue({
            data: {
              data: [],
            },
          });

          return store.dispatch('loadAll', {
            options: {
              include: 'customers',
            },
          }).then(() => {
            expect(api.get).toHaveBeenCalledWith('widgets?include=customers');
          });
        });
      });

      describe('error', () => {
        const error = { dummy: 'error' };

        let response;

        beforeEach(() => {
          api.get.mockRejectedValue(error);
          response = store.dispatch('loadAll');
        });

        it('rejects with the error', () => {
          expect(response).rejects.toEqual(error);
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(true);
          });
        });
      });
    });

    describe('filtering', () => {
      const filter = {
        status: 'draft',
      };

      describe('success', () => {
        beforeEach(() => {
          store.commit('REPLACE_ALL_RECORDS', [
            {
              type: 'widget',
              id: '1',
              attributes: {
                title: 'Non-Matching',
              },
            },
          ]);

          api.get.mockResolvedValue({
            data: {
              data: [
                {
                  type: 'widget',
                  id: '2',
                  attributes: {
                    title: 'Foo',
                  },
                },
                {
                  type: 'widget',
                  id: '3',
                  attributes: {
                    title: 'Bar',
                  },
                },
              ],
            },
          });

          return store.dispatch('loadWhere', {
            filter,
            options: {
              include: 'customers',
            },
          });
        });

        it('passes the filter on to the server', () => {
          expect(api.get).toHaveBeenCalledWith(
            'widgets?filter[status]=draft&include=customers',
          );
        });

        it('allows retrieving the results by filter', () => {
          const all = store.getters.all;
          expect(all.length).toEqual(3);

          const filter = {
            status: 'draft',
          };

          const records = store.getters.where({ filter });

          expect(records.length).toEqual(2);

          const firstRecord = records[0];
          expect(firstRecord.id).toEqual('2');
          expect(firstRecord.attributes.title).toEqual('Foo');
        });
      });

      describe('error', () => {
        const error = { dummy: 'error' };

        let response;

        beforeEach(() => {
          api.get.mockRejectedValue(error);
          response = store.dispatch('loadWhere', { filter });
        });

        it('rejects with the error', () => {
          expect(response).rejects.toEqual(error);
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(true);
          });
        });
      });
    });

    describe('by ID', () => {
      const id = '42';
      const record = {
        type: 'widget',
        id,
        attributes: {
          title: 'New Title',
        },
        relationships: {
          customers: [],
        },
      };

      describe('success', () => {
        beforeEach(() => {
          api.get.mockResolvedValue({
            data: {
              data: record,
            },
          });
        });

        describe('when the record is not yet present in the store', () => {
          beforeEach(() => {
            store.commit('REPLACE_ALL_RECORDS', [
              {
                type: 'widget',
                id: '27',
                attributes: {
                  title: 'Old Title',
                },
              },
            ]);

            return store.dispatch('loadById', {
              id,
              options: {
                include: 'customers',
              },
            });
          });

          it('makes the correct request', () => {
            expect(api.get).toHaveBeenCalledWith(
              'widgets/42?include=customers',
            );
          });

          it('adds the record to the list of all records', () => {
            const records = store.getters.all;

            expect(records.length).toEqual(2);

            const storedRecord = records.find(r => r.id === id);
            expect(storedRecord.attributes.title).toEqual('New Title');
          });
        });

        describe('when the record is already present in the store', () => {
          beforeEach(() => {
            store.commit('REPLACE_ALL_RECORDS', [
              {
                type: 'widget',
                id: '42',
                attributes: {
                  title: 'Old Title',
                },
              },
            ]);

            return store.dispatch('loadById', id);
          });

          it('overwrites the record in the store', () => {
            const records = store.getters.all;

            expect(records.length).toEqual(1);

            const storedRecord = records[0];
            expect(storedRecord.attributes.title).toEqual('New Title');
            expect(storedRecord.relationships.customers).toEqual([]);
          });
        });
      });

      describe('error', () => {
        const error = { dummy: 'error' };

        let response;

        beforeEach(() => {
          api.get.mockRejectedValue(error);
          response = store.dispatch('loadById', { id });
        });

        it('rejects with the error', () => {
          expect(response).rejects.toEqual(error);
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(true);
          });
        });
      });
    });

    describe('related', () => {
      const parent = {
        type: 'users',
        id: '42',
      };

      describe('success', () => {
        describe('when relationship name is the same as resource name', () => {
          beforeEach(() => {
            api.get.mockResolvedValue({
              data: {
                data: [
                  {
                    type: 'widget',
                    id: '1',
                    attributes: {
                      title: 'Foo',
                    },
                  },
                  {
                    type: 'widget',
                    id: '2',
                    attributes: {
                      title: 'Bar',
                    },
                  },
                ],
              },
            });

            return store.dispatch('loadRelated', { parent });
          });

          it('requests the resource endpoint', () => {
            expect(api.get).toHaveBeenCalledWith(
              'users/42/widgets?',
            );
          });

          it('allows retrieving related records', () => {
            const records = store.getters.related({ parent });
            expect(records.length).toEqual(2);
          });
        });

        describe('when relationship name is not the resource name', () => {
          beforeEach(() => {
            api.get.mockResolvedValue({
              data: {
                data: [
                  {
                    type: 'widget',
                    id: '1',
                    attributes: {
                      title: 'Foo',
                    },
                  },
                  {
                    type: 'widget',
                    id: '2',
                    attributes: {
                      title: 'Bar',
                    },
                  },
                ],
              },
            });

            return store.dispatch('loadRelated', {
              parent,
              relationship: 'purchased-widgets',
            });
          });

          it('requests the resource endpoint', () => {
            expect(api.get).toHaveBeenCalledWith(
              'users/42/purchased-widgets?',
            );
          });

          it('allows retrieving related records', () => {
            const records = store.getters.related({
              parent,
              relationship: 'purchased-widgets',
            });
            expect(records.length).toEqual(2);
          });
        });
      });

      describe('error', () => {
        const error = { dummy: 'error' };

        let response;

        beforeEach(() => {
          api.get.mockRejectedValue(error);
          response = store.dispatch('loadRelated', { parent });
        });

        it('rejects with the error', () => {
          expect(response).rejects.toEqual(error);
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(true);
          });
        });
      });
    });
  });

  describe('retrieving from the store', () => {
    beforeEach(() => {
      store.commit('REPLACE_ALL_RECORDS', [
        {
          type: 'widget',
          id: '27',
          attributes: {
            title: 'Foo',
          },
        },
        {
          type: 'widget',
          id: '42',
          attributes: {
            title: 'Bar',
          },
        },
      ]);
    });

    describe('all', () => {
      it('returns all records', () => {
        const result = store.getters.all;

        expect(result.length).toEqual(2);
        expect(result[0].id).toEqual('27');
      });
    });

    describe('by ID', () => {
      it('allows retrieving the record by ID', () => {
        const id = '42';
        const storedRecord = store.getters.byId({ id });
        expect(storedRecord.id).toEqual(id);
        expect(storedRecord.attributes.title).toEqual('Bar');
      });
    });

    describe('related', () => {
      it('allows retrieving related records', () => {
        store.commit('REPLACE_ALL_RELATED', [
          {
            type: 'user',
            id: '42',
            relatedIds: ['27', '42'],
          },
        ]);

        store.commit('REPLACE_ALL_RECORDS', [
          {
            type: 'widgets',
            id: '9',
            attributes: {
              title: 'Foo',
            },
          },
          {
            type: 'widgets',
            id: '27',
            attributes: {
              title: 'Bar',
            },
          },
          {
            type: 'widgets',
            id: '42',
            attributes: {
              title: 'Baz',
            },
          },
        ]);

        const parent = {
          type: 'user',
          id: '42',
        };

        const result = store.getters.related({
          parent,
          relationship: 'purchased-widgets',
        });

        expect(result.length).toEqual(2);
        expect(result[0].id).toEqual('27');
        expect(result[0].attributes.title).toEqual('Bar');
      });

      it('does not error out if there is no relationship data', () => {
        const parent = {
          type: 'user',
          id: '27',
        };

        const result = store.getters.related({
          parent,
          relationship: 'purchased-widgets',
        });

        expect(result).toEqual([]);
      });
    });

    describe('filter', () => {
      it('does not error on filter that has not been sent', () => {
        const filter = {
          first: 'time',
        };

        const result = store.getters.where({ filter });

        expect(result).toEqual([]);
      });
    });
  });

  describe('creating', () => {
    const widget = {
      attributes: {
        title: 'Baz',
      },
    };

    describe('success', () => {
      beforeEach(() => {
        api.post.mockResolvedValue({
          data: {
            data: {
              type: 'widget',
              id: '27',
              attributes: widget.attributes,
            },
          },
        });
      });

      it('sends the record to the server', () => {
        return store.dispatch('create', widget)
          .then(() => {
            const expectedBody = {
              data: {
                type: 'widgets',
                attributes: widget.attributes,
              },
            };
            expect(api.post).toHaveBeenCalledWith('widgets', expectedBody);
          });
      });

      it('adds the record to the list', () => {
        return store.dispatch('create', widget)
          .then(() => {
            const records = store.getters.all;

            expect(records.length).toEqual(1);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('27');
            expect(firstRecord.attributes.title).toEqual('Baz');
          });
      });
    });

    describe('error', () => {
      const error = { dummy: 'error' };

      let response;

      beforeEach(() => {
        api.post.mockRejectedValue(error);
        response = store.dispatch('create', widget);
      });

      it('rejects with the error', () => {
        expect(response).rejects.toEqual(error);
      });

      it('sets the error flag', () => {
        return response.catch(() => {
          expect(store.getters.error).toEqual(true);
        });
      });
    });
  });

  describe('updating', () => {
    const record = {
      type: 'widget',
      id: '42',
      attributes: {
        title: 'Baz',
      },
      relationships: {
        categories: {
          data: [
            { type: 'category', id: '27' },
          ],
        },
      },
    };

    describe('success', () => {
      const recordWithUpdatedData = {
        type: 'widget',
        id: '27',
        attributes: {
          title: 'Bar',
        },
      };

      beforeEach(() => {
        api.patch.mockResolvedValue({ data: recordWithUpdatedData });
      });

      it('sends the record to the server', () => {
        const expectedBody = {
          data: record,
        };
        return store.dispatch('update', record)
          .then(() => {
            expect(api.patch).toHaveBeenCalledWith(
              `widgets/${record.id}`,
              expectedBody,
            );
          });
      });

      it('overwrites an existing record with the same ID', () => {
        store.commit('REPLACE_ALL_RECORDS', [
          {
            type: 'widget',
            id: '27',
            attributes: {
              title: 'Foo',
            },
          },
        ]);

        store.dispatch('update', recordWithUpdatedData)
          .then(() => {
            const records = store.getters.all;
            expect(records.length).toEqual(1);
            const firstRecord = records[0];
            expect(firstRecord.attributes.title).toEqual('Bar');
          });
      });
    });

    describe('error', () => {
      const error = { dummy: 'error' };

      let response;

      beforeEach(() => {
        api.patch.mockRejectedValue(error);
        response = store.dispatch('update', record);
      });

      it('rejects with the error', () => {
        expect(response).rejects.toEqual(error);
      });

      it('sets the error flag', () => {
        return response.catch(() => {
          expect(store.getters.error).toEqual(true);
        });
      });
    });
  });

  describe('deleting', () => {
    const record = {
      type: 'widget',
      id: '42',
      attributes: {
        title: 'Baz',
      },
    };

    describe('success', () => {
      const allRecords = [
        record,
        {
          type: 'widget',
          id: '27',
          attributes: {
            title: 'Other',
          },
        },
      ];

      beforeEach(() => {
        store.commit('REPLACE_ALL_RECORDS', allRecords);

        api.delete.mockResolvedValue();
      });

      it('sends the delete request to the server', () => {
        store.dispatch('delete', record)
          .then(() => {
            expect(api.delete).toHaveBeenCalledWith(`widgets/${record.id}`);
          });
      });

      it('removes the record from the list', () => {
        store.dispatch('delete', record)
          .then(() => {
            const records = store.getters.all;
            expect(records.length).toEqual(allRecords.length - 1);
          });
      });
    });

    describe('error', () => {
      const error = { dummy: 'error' };

      let response;

      beforeEach(() => {
        api.delete.mockRejectedValue(error);
        response = store.dispatch('delete', record);
      });

      it('rejects with the error', () => {
        expect(response).rejects.toEqual(error);
      });

      it('sets the error flag', () => {
        return response.catch(() => {
          expect(store.getters.error).toEqual(true);
        });
      });
    });  });
});
