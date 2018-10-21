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
      const records = [
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
      ];

      it('sets loading to true while loading', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
          },
        });
        store.dispatch('loadAll');
        expect(store.getters.loading).toEqual(true);
      });

      it('resets the error flag', () => {
        api.get
          .mockRejectedValueOnce()
          .mockResolvedValueOnce({
            data: {
              data: records,
            },
          });

        return store.dispatch('loadAll')
          .catch(() => store.dispatch('loadAll'))
          .then(() => {
            expect(store.getters.error).toEqual(false);
          });
      });

      describe('with no options', () => {
        beforeEach(() => {
          api.get.mockResolvedValue({
            data: {
              data: records,
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

      describe('with options', () => {
        it('passes the options onto the server request', () => {
          api.get.mockResolvedValue({
            data: {
              data: [],
            },
          });

          return store.dispatch('loadAll', {
            options: {
              'fields[widgets]': 'title',
            },
          }).then(() => {
            expect(api.get)
              .toHaveBeenCalledWith('widgets?fields[widgets]=title');
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

        it('sets loading to false', () => {
          return response.catch(() => {
            expect(store.getters.loading).toEqual(false);
          });
        });
      });
    });

    describe('filtering', () => {
      const records = [
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
      ];

      const filter = {
        status: 'draft',
      };

      it('sets loading to true while loading', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
          },
        });
        store.dispatch('loadWhere', { filter });
        expect(store.getters.loading).toEqual(true);
      });

      it('resets the error flag', () => {
        api.get
          .mockRejectedValueOnce()
          .mockResolvedValueOnce({
            data: {
              data: records,
            },
          });

        return store.dispatch('loadWhere', { filter })
          .catch(() => store.dispatch('loadWhere', { filter }))
          .then(() => {
            expect(store.getters.error).toEqual(false);
          });
      });

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
              data: records,
            },
          });

          return store.dispatch('loadWhere', {
            filter,
            options: {
              'fields[widgets]': 'title',
            },
          });
        });

        it('sets loading to false', () => {
          expect(store.getters.loading).toEqual(false);
        });

        it('passes the filter on to the server', () => {
          expect(api.get).toHaveBeenCalledWith(
            'widgets?filter[status]=draft&fields[widgets]=title',
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

        it('sets loading to true while loading', () => {
          store.dispatch('loadById', { id });
          expect(store.getters.loading).toEqual(true);
        });

        it('resets the error flag', () => {
          api.get
            .mockRejectedValueOnce()
            .mockResolvedValueOnce({
              data: {
                data: record,
              },
            });

          return store.dispatch('loadById', { id })
            .catch(() => store.dispatch('loadById', { id }))
            .then(() => {
              expect(store.getters.error).toEqual(false);
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
                'fields[widgets]': 'title',
              },
            });
          });

          it('makes the correct request', () => {
            expect(api.get).toHaveBeenCalledWith(
              'widgets/42?fields[widgets]=title',
            );
          });

          it('sets loading to false', () => {
            expect(store.getters.loading).toEqual(false);
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

        it('sets loading to false', () => {
          return response.catch(() => {
            expect(store.getters.loading).toEqual(false);
          });
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(true);
          });
        });
      });
    });

    describe('related', () => {
      const records = [
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
      ];

      const parent = {
        type: 'users',
        id: '42',
      };

      it('sets loading to true while loading', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
          },
        });
        store.dispatch('loadRelated', { parent });
        expect(store.getters.loading).toEqual(true);
      });

      it('resets the error flag', () => {
        api.get
          .mockRejectedValueOnce()
          .mockResolvedValueOnce({
            data: {
              data: records,
            },
          });

        return store.dispatch('loadRelated', { parent })
          .catch(() => store.dispatch('loadRelated', { parent }))
          .then(() => {
            expect(store.getters.error).toEqual(false);
          });
      });

      describe('success', () => {
        describe('when relationship name is the same as resource name', () => {
          beforeEach(() => {
            api.get.mockResolvedValue({
              data: {
                data: records,
              },
            });

            return store.dispatch('loadRelated', { parent });
          });

          it('requests the resource endpoint', () => {
            expect(api.get).toHaveBeenCalledWith(
              'users/42/widgets?',
            );
          });

          it('sets loading to false', () => {
            expect(store.getters.loading).toEqual(false);
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

        it('sets loading to false', () => {
          return response.catch(() => {
            expect(store.getters.loading).toEqual(false);
          });
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

    const responseWidget = {
      type: 'widget',
      id: '27',
      attributes: widget.attributes,
    };

    it('sets loading to true while loading', () => {
      api.post.mockResolvedValue({
        data: {
          data: responseWidget,
        },
      });
      store.dispatch('create', widget);
      expect(store.getters.loading).toEqual(true);
    });

    it('resets the error flag', () => {
      api.post
        .mockRejectedValueOnce()
        .mockResolvedValueOnce({
          data: {
            data: responseWidget,
          },
        });

      return store.dispatch('create', widget)
        .catch(() => store.dispatch('create', widget))
        .then(() => {
          expect(store.getters.error).toEqual(false);
        });
    });

    describe('success', () => {
      beforeEach(() => {
        api.post.mockResolvedValue({
          data: {
            data: responseWidget,
          },
        });

        return store.dispatch('create', widget);
      });

      it('sends the record to the server', () => {
        const expectedBody = {
          data: {
            type: 'widgets',
            attributes: widget.attributes,
          },
        };
        expect(api.post).toHaveBeenCalledWith('widgets', expectedBody);
      });

      it('sets loading to false', () => {
        expect(store.getters.loading).toEqual(false);
      });

      it('adds the record to the list', () => {
        const records = store.getters.all;

        expect(records.length).toEqual(1);

        const firstRecord = records[0];
        expect(firstRecord.id).toEqual('27');
        expect(firstRecord.attributes.title).toEqual('Baz');
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

      it('sets loading to false', () => {
        return response.catch(() => {
          expect(store.getters.loading).toEqual(false);
        });
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

    const recordWithUpdatedData = {
      type: 'widget',
      id: '42',
      attributes: {
        title: 'Bar',
      },
    };

    it('sets loading to true while loading', () => {
      api.patch.mockResolvedValue({
        data: {
          data: recordWithUpdatedData,
        },
      });
      store.dispatch('update', record);
      expect(store.getters.loading).toEqual(true);
    });

    it('resets the error flag', () => {
      api.patch
        .mockRejectedValueOnce()
        .mockResolvedValueOnce({
          data: {
            data: recordWithUpdatedData,
          },
        });

      return store.dispatch('update', record)
        .catch(() => store.dispatch('update', record))
        .then(() => {
          expect(store.getters.error).toEqual(false);
        });
    });

    describe('success', () => {
      beforeEach(() => {
        // returned data not used right now
        // probably need to in case server chagnes the values
        api.patch.mockResolvedValue({ data: {} });

        store.commit('REPLACE_ALL_RECORDS', [
          {
            type: 'widget',
            id: '42',
            attributes: {
              title: 'Foo',
            },
          },
        ]);

        return store.dispatch('update', recordWithUpdatedData);
      });

      it('sends the record to the server', () => {
        const expectedBody = {
          data: recordWithUpdatedData,
        };

        expect(api.patch).toHaveBeenCalledWith(
          `widgets/${record.id}`,
          expectedBody,
        );
      });

      it('sets loading to false', () => {
        expect(store.getters.loading).toEqual(false);
      });

      it('overwrites an existing record with the same ID', () => {
        const records = store.getters.all;
        expect(records.length).toEqual(1);
        const firstRecord = records[0];
        expect(firstRecord.attributes.title).toEqual('Bar');
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

      it('sets loading to false', () => {
        return response.catch(() => {
          expect(store.getters.loading).toEqual(false);
        });
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

    it('sets loading to true while loading', () => {
      api.delete.mockResolvedValue();
      store.dispatch('delete', record);
      expect(store.getters.loading).toEqual(true);
    });

    it('resets the error flag', () => {
      api.delete
        .mockRejectedValueOnce()
        .mockResolvedValueOnce();

      return store.dispatch('delete', record)
        .catch(() => store.dispatch('delete', record))
        .then(() => {
          expect(store.getters.error).toEqual(false);
        });
    });

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

        return store.dispatch('delete', record);
      });

      it('sends the delete request to the server', () => {
        expect(api.delete).toHaveBeenCalledWith(`widgets/${record.id}`);
      });

      it('sets loading to false', () => {
        expect(store.getters.loading).toEqual(false);
      });

      it('removes the record from the list', () => {
        const records = store.getters.all;
        expect(records.length).toEqual(allRecords.length - 1);
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

      it('sets loading to false', () => {
        return response.catch(() => {
          expect(store.getters.loading).toEqual(false);
        });
      });

      it('sets the error flag', () => {
        return response.catch(() => {
          expect(store.getters.error).toEqual(true);
        });
      });
    });
  });
});
