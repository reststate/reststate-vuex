import Vue from 'vue';
import Vuex from 'vuex';
import { resourceModule, mapResourceModules } from '../src/reststate-vuex';

Vue.use(Vuex);

describe('resourceModule()', function () {
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

      const meta = { metaKey: 'metaValue' };

      it('sets loading to true while loading', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
          },
        });
        store.dispatch('loadAll');
        expect(store.getters.isLoading).toEqual(true);
      });

      it('resets the error flag', () => {
        api.get.mockRejectedValueOnce().mockResolvedValueOnce({
          data: {
            data: records,
          },
        });

        return store
          .dispatch('loadAll')
          .catch(() => store.dispatch('loadAll'))
          .then(() => {
            expect(store.getters.isError).toEqual(false);
          });
      });

      describe('with no options', () => {
        beforeEach(() => {
          api.get.mockResolvedValue({
            data: {
              data: records,
              meta,
            },
          });

          return store.dispatch('loadAll');
        });

        it('sets loading to false', () => {
          expect(store.getters.isLoading).toEqual(false);
        });

        it('makes the records accessible via getter', () => {
          const records = store.getters.all;

          expect(records.length).toEqual(2);

          const firstRecord = records[0];
          expect(firstRecord.id).toEqual('1');
          expect(firstRecord.attributes.title).toEqual('Foo');
        });

        it('exposes meta data returned', () => {
          const { lastMeta } = store.getters;
          expect(lastMeta).toEqual(meta);
        });
      });

      describe('with options', () => {
        it('passes the options onto the server request', () => {
          api.get.mockResolvedValue({
            data: {
              data: [],
            },
          });

          return store
            .dispatch('loadAll', {
              options: {
                'fields[widgets]': 'title',
              },
            })
            .then(() => {
              expect(api.get).toHaveBeenCalledWith(
                'widgets?fields[widgets]=title',
              );
            });
        });
      });

      it('removes records in the store not in the response', () => {
        const firstRecords = [
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
        const secondRecords = [
          {
            type: 'widget',
            id: '1',
            attributes: {
              title: 'Foo',
            },
          },
          {
            type: 'widget',
            id: '3',
            attributes: {
              title: 'Baz',
            },
          },
        ];

        api.get
          .mockResolvedValueOnce({ data: { data: firstRecords } })
          .mockResolvedValueOnce({ data: { data: secondRecords } });

        return store
          .dispatch('loadAll')
          .then(() => store.dispatch('loadAll'))
          .then(() => {
            const records = store.getters.all;
            expect(records.length).toEqual(2);
            expect(records[0].id).toEqual('1');
            expect(records[1].id).toEqual('3');
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
            expect(store.getters.isError).toEqual(true);
          });
        });

        it('exposes the error response', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(error);
          });
        });

        it('sets loading to false', () => {
          return response.catch(() => {
            expect(store.getters.isLoading).toEqual(false);
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

      const meta = { metaKey: 'metaValue' };

      it('sets loading to true while loading', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
          },
        });
        store.dispatch('loadWhere', { filter });
        expect(store.getters.isLoading).toEqual(true);
      });

      it('resets the error flag', () => {
        api.get.mockRejectedValueOnce().mockResolvedValueOnce({
          data: {
            data: records,
          },
        });

        return store
          .dispatch('loadWhere', { filter })
          .catch(() => store.dispatch('loadWhere', { filter }))
          .then(() => {
            expect(store.getters.isError).toEqual(false);
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
              meta,
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
          expect(store.getters.isLoading).toEqual(false);
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

        it('exposes meta data returned', () => {
          const { lastMeta } = store.getters;
          expect(lastMeta).toEqual(meta);
        });
      });

      describe('when changing options', () => {
        const reversedRecords = records.slice().reverse();
        const firstOptions = { sort: 'foo' };
        const secondOptions = { sort: 'bar' };

        beforeEach(() => {
          api.get
            .mockResolvedValueOnce({
              data: {
                data: records,
                meta,
              },
            })
            .mockResolvedValueOnce({
              data: {
                data: reversedRecords,
                meta,
              },
            });

          return store
            .dispatch('loadWhere', {
              filter,
              options: firstOptions,
            })
            .then(() =>
              store.dispatch('loadWhere', {
                filter,
                options: secondOptions,
              }),
            );
        });

        it('returns the second set of records', () => {
          const records = store.getters.where({
            filter,
            options: secondOptions,
          });
          expect(records).toEqual(reversedRecords);
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
            expect(store.getters.isError).toEqual(true);
          });
        });

        it('exposes the error response', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(error);
          });
        });
      });
    });

    describe('pagination', () => {
      const firstPage = [
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

      const secondPage = [
        {
          type: 'widget',
          id: '3',
          attributes: {
            title: 'Baz',
          },
        },
        {
          type: 'widget',
          id: '4',
          attributes: {
            title: 'Qux',
          },
        },
      ];

      describe('initial request with page params', () => {
        it('sets loading to true while loading', () => {
          api.get.mockResolvedValue({
            data: {
              data: firstPage,
              links: {
                next:
                  'https://api.example.com/widgets?page[number]=2&page[size]=2',
              },
            },
          });
          store.dispatch('loadPage', {
            options: {
              'page[number]': 1,
              'page[size]': 2,
            },
          });
          expect(store.getters.isLoading).toEqual(true);
        });

        describe('success', () => {
          const meta = {
            totalItems: 23,
            itemsPerPage: 10,
            currentPage: 1,
          };

          beforeEach(() => {
            api.get.mockResolvedValue({
              data: {
                data: firstPage,
                links: {
                  next:
                    'https://api.example.com/widgets?page[number]=2&page[size]=2',
                },
                meta,
              },
            });

            return store.dispatch('loadPage', {
              options: {
                'page[number]': 1,
                'page[size]': 2,
              },
            });
          });

          it('sets loading to false', () => {
            expect(store.getters.isLoading).toEqual(false);
          });

          it('passes the pagination on to the server', () => {
            expect(api.get).toHaveBeenCalledWith(
              'widgets?page[number]=1&page[size]=2',
            );
          });

          it('allows retrieving the results by page', () => {
            const records = store.getters.page;
            expect(records.length).toEqual(2);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('1');
            expect(firstRecord.attributes.title).toEqual('Foo');
          });

          it('exposes whether there is a next page', () => {
            const { hasNext } = store.getters;
            expect(hasNext).toEqual(true);
          });

          it('exposes whether there is a previous page', () => {
            const { hasPrevious } = store.getters;
            expect(hasPrevious).toEqual(false);
          });

          it('exposes meta data returned', () => {
            const { lastMeta } = store.getters;
            expect(lastMeta).toEqual(meta);
          });
        });

        describe('error', () => {
          const error = { dummy: 'error' };

          let response;

          beforeEach(() => {
            api.get.mockRejectedValue(error);
            response = store.dispatch('loadPage', {
              options: {
                'page[number]': 1,
                'page[size]': 2,
              },
            });
          });

          it('rejects with the error', () => {
            expect(response).rejects.toEqual(error);
          });

          it('sets the error flag', () => {
            return response.catch(() => {
              expect(store.getters.isError).toEqual(true);
            });
          });

          it('exposes the error response', () => {
            return response.catch(() => {
              expect(store.getters.error).toEqual(error);
            });
          });
        });
      });

      describe('next page request', () => {
        const meta = { metaKey: 'metaValue' };

        beforeEach(() => {
          api.get
            .mockResolvedValueOnce({
              data: {
                data: firstPage,
                links: {
                  next:
                    'https://api.example.com/widgets?page[number]=2&page[size]=2',
                },
              },
            })
            .mockResolvedValueOnce({
              data: {
                data: secondPage,
                links: {
                  prev:
                    'https://api.example.com/widgets?page[number]=1&page[size]=2',
                },
                meta,
              },
            });

          return store
            .dispatch('loadPage', {
              options: {
                'page[number]': 1,
                'page[size]': 2,
              },
            })
            .then(() => store.dispatch('loadNextPage'));
        });

        it('passes the pagination on to the server', () => {
          expect(api.get).toHaveBeenCalledWith(
            'https://api.example.com/widgets?page[number]=2&page[size]=2',
          );
        });

        it('allows retrieving the results by page', () => {
          const records = store.getters.page;
          expect(records.length).toEqual(2);

          const firstRecord = records[0];
          expect(firstRecord.id).toEqual('3');
          expect(firstRecord.attributes.title).toEqual('Baz');
        });

        it('exposes whether there is a next page', () => {
          const { hasNext } = store.getters;
          expect(hasNext).toEqual(false);
        });

        it('exposes whether there is a previous page', () => {
          const { hasPrevious } = store.getters;
          expect(hasPrevious).toEqual(true);
        });

        it('exposes meta data returned', () => {
          const { lastMeta } = store.getters;
          expect(lastMeta).toEqual(meta);
        });
      });

      describe('previous page request', () => {
        const meta = { metaKey: 'metaValue' };

        beforeEach(() => {
          api.get
            .mockResolvedValueOnce({
              data: {
                data: secondPage,
                links: {
                  prev:
                    'https://api.example.com/widgets?page[number]=1&page[size]=2',
                },
              },
            })
            .mockResolvedValueOnce({
              data: {
                data: firstPage,
                links: {
                  next:
                    'https://api.example.com/widgets?page[number]=2&page[size]=2',
                },
                meta,
              },
            });

          return store
            .dispatch('loadPage', {
              options: {
                'page[number]': 2,
                'page[size]': 2,
              },
            })
            .then(() => store.dispatch('loadPreviousPage'));
        });

        it('passes the pagination on to the server', () => {
          expect(api.get).toHaveBeenCalledWith(
            'https://api.example.com/widgets?page[number]=1&page[size]=2',
          );
        });

        it('allows retrieving the results by page', () => {
          const records = store.getters.page;
          expect(records.length).toEqual(2);

          const firstRecord = records[0];
          expect(firstRecord.id).toEqual('1');
          expect(firstRecord.attributes.title).toEqual('Foo');
        });

        it('exposes whether there is a next page', () => {
          const { hasNext } = store.getters;
          expect(hasNext).toEqual(true);
        });

        it('exposes whether there is a previous page', () => {
          const { hasPrevious } = store.getters;
          expect(hasPrevious).toEqual(false);
        });

        it('exposes meta data returned', () => {
          const { lastMeta } = store.getters;
          expect(lastMeta).toEqual(meta);
        });
      });

      describe('success', () => {
        const firstPage = [
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

        const secondPage = [
          {
            type: 'widget',
            id: '3',
            attributes: {
              title: 'Baz',
            },
          },
          {
            type: 'widget',
            id: '4',
            attributes: {
              title: 'Qux',
            },
          },
        ];

        beforeEach(() => {
          api.get
            .mockResolvedValueOnce({
              data: {
                data: firstPage,
                links: {
                  next:
                    'https://api.example.com/widgets?page[number]=2&page[size]=2',
                },
              },
            })
            .mockResolvedValueOnce({
              data: {
                data: secondPage,
                links: {
                  prev:
                    'https://api.example.com/widgets?page[number]=1&page[size]=2',
                },
              },
            })
            .mockResolvedValueOnce({
              data: {
                data: firstPage,
                links: {
                  next:
                    'https://api.example.com/widgets?page[number]=2&page[size]=2',
                },
              },
            });

          return store.dispatch('loadPage', {
            options: {
              'page[number]': 1,
              'page[size]': 2,
            },
          });
        });

        it('passes the pagination on to the server', () => {
          expect(api.get).toHaveBeenCalledWith(
            'widgets?page[number]=1&page[size]=2',
          );
        });

        it('allows retrieving the results by page', () => {
          const records = store.getters.page;
          expect(records.length).toEqual(2);

          const firstRecord = records[0];
          expect(firstRecord.id).toEqual('1');
          expect(firstRecord.attributes.title).toEqual('Foo');
        });

        it('exposes whether there is a next page', () => {
          const { hasNext } = store.getters;
          expect(hasNext).toEqual(true);
        });

        it('exposes whether there is a previous page', () => {
          const { hasPrevious } = store.getters;
          expect(hasPrevious).toEqual(false);
        });

        it('allows retrieving the next page', () => {
          return store.dispatch('loadNextPage').then(() => {
            expect(api.get).toHaveBeenCalledWith(
              'https://api.example.com/widgets?page[number]=2&page[size]=2',
            );

            expect(store.getters.hasNext).toEqual(false);
            expect(store.getters.hasPrevious).toEqual(true);

            const records = store.getters.page;
            expect(records.length).toEqual(2);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('3');
          });
        });

        it('allows retrieving the previous page', () => {
          return store
            .dispatch('loadNextPage')
            .then(() => store.dispatch('loadPreviousPage'))
            .then(() => {
              expect(store.getters.hasNext).toEqual(true);
              expect(store.getters.hasPrevious).toEqual(false);

              const records = store.getters.page;
              expect(records.length).toEqual(2);

              const firstRecord = records[0];
              expect(firstRecord.id).toEqual('1');
            });
        });
      });

      describe('when changing options', () => {
        const reversedFirstPage = firstPage.slice().reverse();
        const firstOptions = {
          'page[number]': 1,
          'page[size]': 2,
          sort: 'foo',
        };
        const secondOptions = {
          'page[number]': 1,
          'page[size]': 2,
          sort: 'bar',
        };

        const meta = {
          totalItems: 23,
          itemsPerPage: 10,
          currentPage: 1,
        };

        beforeEach(() => {
          api.get
            .mockResolvedValueOnce({
              data: {
                data: firstPage,
                meta,
              },
            })
            .mockResolvedValueOnce({
              data: {
                data: reversedFirstPage,
                meta,
              },
            });

          return store
            .dispatch('loadPage', {
              options: firstOptions,
            })
            .then(() =>
              store.dispatch('loadPage', {
                options: secondOptions,
              }),
            );
        });

        it('returns the second set of records', () => {
          const records = store.getters.page;
          expect(records).toEqual(reversedFirstPage);
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

      const meta = { metaKey: 'metaValue' };

      describe('success', () => {
        beforeEach(() => {
          api.get.mockResolvedValue({
            data: {
              data: record,
              meta,
            },
          });
        });

        it('sets loading to true while loading', () => {
          store.dispatch('loadById', { id });
          expect(store.getters.isLoading).toEqual(true);
        });

        it('resets the error flag', () => {
          api.get.mockRejectedValueOnce().mockResolvedValueOnce({
            data: {
              data: record,
            },
          });

          return store
            .dispatch('loadById', { id })
            .catch(() => store.dispatch('loadById', { id }))
            .then(() => {
              expect(store.getters.isError).toEqual(false);
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
            expect(store.getters.isLoading).toEqual(false);
          });

          it('adds the record to the list of all records', () => {
            const records = store.getters.all;

            expect(records.length).toEqual(2);

            const storedRecord = records.find(r => r.id === id);
            expect(storedRecord.attributes.title).toEqual('New Title');
          });

          it('exposes meta data returned', () => {
            const { lastMeta } = store.getters;
            expect(lastMeta).toEqual(meta);
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
            expect(store.getters.isLoading).toEqual(false);
          });
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.isError).toEqual(true);
          });
        });

        it('exposes the error response', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(error);
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
        attributes: {
          name: 'fred',
        },
      };

      const meta = { metaKey: 'metaValue' };

      it('sets loading to true while loading', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
          },
        });
        store.dispatch('loadRelated', { parent });
        expect(store.getters.isLoading).toEqual(true);
      });

      it('resets the error flag', () => {
        api.get.mockRejectedValueOnce().mockResolvedValueOnce({
          data: {
            data: records,
          },
        });

        return store
          .dispatch('loadRelated', { parent })
          .catch(() => store.dispatch('loadRelated', { parent }))
          .then(() => {
            expect(store.getters.isError).toEqual(false);
          });
      });

      describe('success', () => {
        describe('when relationship name is the same as resource name', () => {
          beforeEach(() => {
            api.get.mockResolvedValue({
              data: {
                data: records,
                meta,
              },
            });

            return store.dispatch('loadRelated', { parent });
          });

          it('requests the resource endpoint', () => {
            expect(api.get).toHaveBeenCalledWith('users/42/widgets?');
          });

          it('sets loading to false', () => {
            expect(store.getters.isLoading).toEqual(false);
          });

          it('allows retrieving related records by full parent', () => {
            const records = store.getters.related({ parent });
            expect(records.length).toEqual(2);
          });

          it('allows retrieving related records by parent identifier', () => {
            const parentIdentifier = {
              id: parent.id,
              type: parent.type,
            };
            const records = store.getters.related({ parent: parentIdentifier });
            expect(records.length).toEqual(2);
          });

          it('exposes meta data returned', () => {
            const { lastMeta } = store.getters;
            expect(lastMeta).toEqual(meta);
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
            expect(api.get).toHaveBeenCalledWith('users/42/purchased-widgets?');
          });

          it('allows retrieving related records', () => {
            const records = store.getters.related({
              parent,
              relationship: 'purchased-widgets',
            });
            expect(records.length).toEqual(2);
          });
        });

        describe('when relationship is a to-one', () => {
          const record = records[0];

          beforeEach(() => {
            api.get.mockResolvedValue({
              data: {
                data: record,
                meta,
              },
            });

            return store.dispatch('loadRelated', { parent });
          });

          it('allows retrieving related records', () => {
            const results = store.getters.related({ parent });
            expect(results).toEqual(record);
          });

          it('exposes meta data returned', () => {
            const { lastMeta } = store.getters;
            expect(lastMeta).toEqual(meta);
          });
        });

        describe('when changing options', () => {
          const reversedRecords = records.slice().reverse();
          const firstOptions = { sort: 'foo' };
          const secondOptions = { sort: 'bar' };

          beforeEach(() => {
            api.get
              .mockResolvedValueOnce({
                data: {
                  data: records,
                  meta,
                },
              })
              .mockResolvedValueOnce({
                data: {
                  data: reversedRecords,
                  meta,
                },
              });

            return store
              .dispatch('loadRelated', {
                parent,
                options: firstOptions,
              })
              .then(() =>
                store.dispatch('loadRelated', {
                  parent,
                  options: secondOptions,
                }),
              );
          });

          it('returns the second set of records', () => {
            const records = store.getters.related({ parent });
            expect(records).toEqual(reversedRecords);
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
            expect(store.getters.isLoading).toEqual(false);
          });
        });

        it('sets the error flag', () => {
          return response.catch(() => {
            expect(store.getters.isError).toEqual(true);
          });
        });

        it('exposes the error response', () => {
          return response.catch(() => {
            expect(store.getters.error).toEqual(error);
          });
        });
      });

      it('skips records that are not found', () => {
        api.get.mockResolvedValue({
          data: {
            data: records,
            meta,
          },
        });
        api.delete.mockResolvedValue();

        return store
          .dispatch('loadRelated', { parent })
          .then(() => {
            return store.dispatch('delete', records[0]);
          })
          .then(() => {
            const records = store.getters.related({ parent });
            expect(records.length).toEqual(1);
          });
      });
    });

    describe('included', () => {
      describe('to many', () => {
        function sharedExamples() {
          it('makes the primary records accessible via getter', () => {
            const records = this.multiStore.getters['restaurants/all'];

            expect(records.length).toEqual(2);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('1');
            expect(firstRecord.attributes.name).toEqual('Sushi Place');
          });

          it('makes the included records accessible via getter', () => {
            const records = this.multiStore.getters['dishes/all'];

            expect(records.length).toEqual(3);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('1');
            expect(firstRecord.attributes.name).toEqual('California Roll');
          });

          it('makes the included records accessible via relationship', () => {
            const parent = this.primaryRecords[1];
            const records = this.multiStore.getters['dishes/related']({
              parent,
            });

            expect(records.length).toEqual(1);
            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('3');
            expect(firstRecord.attributes.name).toEqual('Avocado Burger');
          });

          it('allows including records multiple levels deep', () => {
            const parent = { type: 'dishes', id: '1' };
            const records = this.multiStore.getters['comments/related']({
              parent,
            });

            expect(records.length).toEqual(1);
            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('1');
            expect(firstRecord.attributes.text).toEqual('my favorite');
          });
        }

        beforeEach(() => {
          this.primaryRecords = [
            {
              type: 'restaurants',
              id: '1',
              attributes: {
                name: 'Sushi Place',
              },
              relationships: {
                dishes: {
                  data: [
                    {
                      type: 'dishes',
                      id: '1',
                    },
                    {
                      type: 'dishes',
                      id: '2',
                    },
                  ],
                },
              },
            },
            {
              type: 'restaurants',
              id: '2',
              attributes: {
                name: 'Burger Place',
              },
              relationships: {
                dishes: {
                  data: [
                    {
                      type: 'dishes',
                      id: '3',
                    },
                  ],
                },
              },
            },
          ];

          this.includedRecords = [
            {
              type: 'dishes',
              id: '1',
              attributes: {
                name: 'California Roll',
              },
              relationships: {
                comments: {
                  data: [
                    {
                      type: 'comments',
                      id: '1',
                    },
                  ],
                },
              },
            },
            {
              type: 'dishes',
              id: '2',
              attributes: {
                name: 'Volcano Roll',
              },
            },
            {
              type: 'dishes',
              id: '3',
              attributes: {
                name: 'Avocado Burger',
              },
            },
            {
              type: 'comments',
              id: '1',
              attributes: {
                text: 'my favorite',
              },
            },
          ];

          this.response = {
            data: this.primaryRecords,
            included: this.includedRecords,
          };

          api.get.mockResolvedValue({
            data: this.response,
          });

          const modules = mapResourceModules({
            names: ['restaurants', 'dishes', 'comments'],
            httpClient: api,
          });
          this.multiStore = new Vuex.Store({
            modules,
          });
        });

        describe('loadAll', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('restaurants/loadAll', {
              include: 'dishes,dishes.comments',
            });
          });

          sharedExamples.bind(this)();
        });

        describe('loadPage', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('restaurants/loadPage', {
              include: 'dishes,dishes.comments',
            });
          });

          sharedExamples.bind(this)();
        });

        describe('loadNextPage', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('restaurants/loadNextPage', {
              include: 'dishes,dishes.comments',
            });
          });

          sharedExamples.bind(this)();
        });

        describe('loadPreviousPage', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('restaurants/loadPreviousPage', {
              include: 'dishes,dishes.comments',
            });
          });

          sharedExamples.bind(this)();
        });
      });

      describe('to one', () => {
        function sharedExamples() {
          it('makes the primary records accessible via getter', () => {
            const records = this.multiStore.getters['dishes/all'];

            expect(records.length).toEqual(2);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('1');
            expect(firstRecord.attributes.name).toEqual('California Roll');
          });

          it('makes the included records accessible via getter', () => {
            const records = this.multiStore.getters['restaurants/all'];

            expect(records.length).toEqual(2);

            const firstRecord = records[0];
            expect(firstRecord.id).toEqual('1');
            expect(firstRecord.attributes.name).toEqual('Sushi Place');
          });

          it('makes the included records accessible via relationship', () => {
            const parent = this.primaryRecords[0];
            const record = this.multiStore.getters['restaurants/related']({
              parent,
              relationship: 'restaurant',
            });

            expect(record.id).toEqual('1');
            expect(record.attributes.name).toEqual('Sushi Place');
          });
        }

        beforeEach(() => {
          this.primaryRecords = [
            {
              type: 'dishes',
              id: '1',
              attributes: {
                name: 'California Roll',
              },
              relationships: {
                restaurant: {
                  data: {
                    type: 'restaurants',
                    id: '1',
                  },
                },
              },
            },
            {
              type: 'dishes',
              id: '2',
              attributes: {
                name: 'Avocado Burger',
              },
              relationships: {
                restaurant: {
                  data: {
                    type: 'restaurants',
                    id: '2',
                  },
                },
              },
            },
          ];

          this.includedRecords = [
            {
              type: 'restaurants',
              id: '1',
              attributes: {
                name: 'Sushi Place',
              },
            },
            {
              type: 'restaurants',
              id: '2',
              attributes: {
                name: 'Burger Place',
              },
            },
          ];

          this.response = {
            data: this.primaryRecords,
            included: this.includedRecords,
          };

          api.get.mockResolvedValue({
            data: this.response,
          });

          const modules = mapResourceModules({
            names: ['restaurants', 'dishes'],
            httpClient: api,
          });
          this.multiStore = new Vuex.Store({
            modules,
          });
        });

        describe('loadAll', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('dishes/loadAll', {
              include: 'restaurant',
            });
          });

          sharedExamples.bind(this)();
        });

        describe('loadPage', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('dishes/loadPage', {
              include: 'restaurant',
            });
          });

          sharedExamples.bind(this)();
        });

        describe('loadNextPage', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('dishes/loadNextPage', {
              include: 'restaurant',
            });
          });

          sharedExamples.bind(this)();
        });

        describe('loadPreviousPage', () => {
          beforeEach(() => {
            return this.multiStore.dispatch('dishes/loadPreviousPage', {
              include: 'restaurant',
            });
          });

          sharedExamples.bind(this)();
        });
      });

      describe('relationships with non-default names', () => {
        it('allows retrieving relationships with non-default names', () => {
          const primaryRecord = {
            type: 'people',
            id: '2',
            attributes: {
              name: 'Child',
            },
            relationships: {
              parent: {
                data: {
                  type: 'people',
                  id: '1',
                },
              },
              child: {
                data: {
                  type: 'people',
                  id: '3',
                },
              },
            },
          };

          const includedRecords = [
            {
              type: 'people',
              id: '1',
              attributes: {
                name: 'Parent',
              },
            },
            {
              type: 'people',
              id: '3',
              attributes: {
                name: 'Grandchild',
              },
            },
          ];

          const response = {
            data: primaryRecord,
            included: includedRecords,
          };

          api.get.mockResolvedValue({
            data: response,
          });

          const modules = mapResourceModules({
            names: ['people'],
            httpClient: api,
          });
          const store = new Vuex.Store({ modules });

          return store
            .dispatch('people/loadById', {
              id: '2',
              options: {
                include: 'parent,child',
              },
            })
            .then(() => {
              const parent = store.getters['people/related']({
                parent: primaryRecord,
                relationship: 'parent',
              });
              const child = store.getters['people/related']({
                parent: primaryRecord,
                relationship: 'child',
              });

              expect(parent.id).toEqual('1');
              expect(child.id).toEqual('3');
            });
        });

        it('retrieves the relationship with the same name as the resource if the name is not specified', () => {
          const primaryRecord = {
            type: 'posts',
            id: '1',
            relationships: {
              secretComments: {
                data: [
                  {
                    type: 'comments',
                    id: '2',
                  },
                ],
              },
              comments: {
                data: [
                  {
                    type: 'comments',
                    id: '1',
                  },
                ],
              },
            },
          };

          const includedRecords = [
            {
              type: 'comments',
              id: '1',
            },
            {
              type: 'comments',
              id: '2',
            },
          ];

          const response = {
            data: primaryRecord,
            included: includedRecords,
          };

          api.get.mockResolvedValue({
            data: response,
          });

          const modules = mapResourceModules({
            names: ['posts', 'comments'],
            httpClient: api,
          });
          const store = new Vuex.Store({ modules });

          return store
            .dispatch('posts/loadById', {
              id: '1',
              options: {
                include: 'comments,secretComments',
              },
            })
            .then(() => {
              const comments = store.getters['comments/related']({
                parent: primaryRecord,
              });

              expect(comments.length).toEqual(1);
              expect(comments[0].id).toEqual('1');
            });
        });
      });
    });
  });

  describe('pushing changes into the store', () => {
    describe('adding records', () => {
      const record = {
        type: 'widget',
        id: '42',
        attributes: {
          title: 'Bar',
        },
      };

      describe('when the record does not yet exist', () => {
        it('adds the record', () => {
          return store.dispatch('storeRecord', record).then(() => {
            const records = store.getters.all;
            expect(records.length).toEqual(1);
            const firstRecord = records[0];
            expect(firstRecord.attributes.title).toEqual('Bar');
          });
        });
      });

      describe('when the record already exists', () => {
        it('replaces the record', () => {
          store.commit('REPLACE_ALL_RECORDS', [
            {
              type: 'widget',
              id: '42',
              attributes: {
                title: 'Foo',
              },
            },
          ]);

          store.dispatch('storeRecord', record).then(() => {
            const records = store.getters.all;
            expect(records.length).toEqual(1);
            const firstRecord = records[0];
            expect(firstRecord.attributes.title).toEqual('Bar');
          });
        });
      });
    });

    describe('removing records', () => {
      it('removes the record from the store', () => {
        const record = {
          type: 'widget',
          id: '42',
          attributes: {
            title: 'Foo',
          },
        };

        store.commit('REPLACE_ALL_RECORDS', [
          record,
          {
            type: 'widget',
            id: '27',
            attributes: {
              title: 'Bar',
            },
          },
        ]);

        store.dispatch('removeRecord', record).then(() => {
          const records = store.getters.all;
          expect(records.length).toEqual(1);
          const firstRecord = records[0];
          expect(firstRecord.attributes.title).toEqual('Bar');
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

      it('can retrieve records with numeric IDs', () => {
        const id = 42;
        const storedRecord = store.getters.byId({ id });
        expect(storedRecord.attributes.title).toEqual('Bar');
      });
    });

    describe('related', () => {
      it('allows retrieving related records', () => {
        store.commit('REPLACE_ALL_RELATED', [
          {
            parent: {
              type: 'user',
              id: '42',
            },
            relationship: 'purchased-widgets',
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

        expect(result).toEqual(null);
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
        expect(store.getters.isLoading).toEqual(false);
      });

      it('adds the record to the list', () => {
        const records = store.getters.all;

        expect(records.length).toEqual(1);

        const firstRecord = records[0];
        expect(firstRecord.id).toEqual('27');
        expect(firstRecord.attributes.title).toEqual('Baz');
      });

      it('makes the record available in the lastCreated getter', () => {
        const record = store.getters.lastCreated;
        expect(record.id).toEqual('27');
        expect(record.attributes.title).toEqual('Baz');
      });
    });

    describe('error', () => {
      const errorResponse = { dummy: 'error' };

      let response;

      beforeEach(() => {
        api.post.mockRejectedValue({ response: errorResponse });
        response = store.dispatch('create', widget);
      });

      it('rejects with the error', () => {
        expect(response).rejects.toEqual(errorResponse);
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
          data: [{ type: 'category', id: '27' }],
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

      it('overwrites an existing record with the same ID', () => {
        const records = store.getters.all;
        expect(records.length).toEqual(1);
        const firstRecord = records[0];
        expect(firstRecord.attributes.title).toEqual('Bar');
      });

      it('updates related to-one records', () => {
        const oldRestaurant = {
          type: 'restaurants',
          id: '2',
        };
        const newRestaurant = {
          type: 'restaurants',
          id: '3',
        };
        const dish = {
          type: 'dishes',
          id: '1',
          relationships: {
            restaurant: {
              data: oldRestaurant,
            },
          },
        };

        api.get.mockResolvedValue({
          data: {
            data: [dish],
            included: [oldRestaurant],
          },
        });
        const modules = mapResourceModules({
          names: ['restaurants', 'dishes'],
          httpClient: api,
        });
        const multiStore = new Vuex.Store({
          modules,
        });
        multiStore.commit('restaurants/REPLACE_ALL_RECORDS', [
          oldRestaurant,
          newRestaurant,
        ]);

        const dishWithUpdatedRelationship = {
          ...dish,
          relationships: {
            restaurant: {
              data: newRestaurant,
            },
          },
        };

        return multiStore
          .dispatch('dishes/loadById', { id: '1' })
          .then(() =>
            multiStore.dispatch('dishes/update', dishWithUpdatedRelationship),
          )
          .then(() => {
            const records = multiStore.getters['restaurants/related']({
              parent: dish,
              relationship: 'restaurant',
            });
            expect(records).toEqual(newRestaurant);
          });
      });

      it('updates related to-many records', () => {
        const keepDish = {
          type: 'dishes',
          id: '1',
        };
        const oldDish = {
          type: 'dishes',
          id: '2',
        };
        const newDish = {
          type: 'dishes',
          id: '3',
        };
        const restaurant = {
          type: 'restaurants',
          id: '1',
          relationships: {
            dishes: {
              data: [keepDish, oldDish],
            },
          },
        };

        api.get.mockResolvedValue({
          data: {
            data: [restaurant],
            included: [keepDish, oldDish],
          },
        });
        const modules = mapResourceModules({
          names: ['restaurants', 'dishes'],
          httpClient: api,
        });
        const multiStore = new Vuex.Store({
          modules,
        });
        multiStore.commit('dishes/REPLACE_ALL_RECORDS', [
          keepDish,
          oldDish,
          newDish,
        ]);

        const restaurantWithUpdatedRelationship = {
          ...restaurant,
          relationships: {
            dishes: {
              data: [keepDish, newDish],
            },
          },
        };

        return multiStore
          .dispatch('restaurants/loadById', { id: '1' })
          .then(
            multiStore.dispatch(
              'restaurants/update',
              restaurantWithUpdatedRelationship,
            ),
          )
          .then(() => {
            const records = multiStore.getters['dishes/related']({
              parent: restaurant,
            });
            expect(records).toEqual([keepDish, newDish]);
          });
      });

      it('updates related to-many empty records', () => {
        const post = {
          type: 'posts',
          id: '1',

          relationships: {
            // ancestor
            author: {
              data: {
                type: 'people',
                id: '1',
              },
            },

            // descendants
            comments: {
              data: [
                {
                  type: 'comments',
                  id: '1',
                },
              ],
            },
          },
        };

        const included = [
          {
            type: 'people',
            id: '1',
          },
          {
            type: 'comments',
            id: '1',
          },
        ];

        const store = new Vuex.Store({
          modules: {
            ...mapResourceModules({
              names: ['posts', 'people', 'comments'],
              httpClient: api,
            }),
          },
        });

        api.get.mockResolvedValue({
          data: {
            included,
            data: post,
          },
        });

        return store.dispatch('posts/loadById', { id: '1' }).then(() => {
          const author = store.getters['people/related']({
            parent: post,
            relationship: 'author',
          });

          // check ancestor
          expect(author).toEqual({
            id: '1',
            type: 'people',
          });

          const comments = store.getters['comments/related']({
            parent: post,
          });

          // check descendants
          expect(comments).toContainEqual({
            id: '1',
            type: 'comments',
          });

          // the new post will not have relationships
          const newPost = {
            type: 'posts',
            id: '1',
            relationships: {
              comments: {
                data: [],
              },
              author: {
                data: null,
              },
            },
          };

          api.get.mockResolvedValue({
            data: {
              data: newPost,
            },
          });

          return store.dispatch('posts/update', newPost).then(() => {
            const author = store.getters['people/related']({
              parent: post,
              relationship: 'author',
            });

            // the new post does not have the author
            expect(author).toEqual(undefined);

            const comments = store.getters['comments/related']({
              parent: post,
            });

            // the new post does not have comments
            expect(comments).toEqual(undefined);
          });
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

        return store.dispatch('delete', record);
      });

      it('sends the delete request to the server', () => {
        expect(api.delete).toHaveBeenCalledWith(`widgets/${record.id}`);
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
    });
  });

  describe('resetting the store', () => {
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

      store.dispatch('resetState');
    });

    it('removes all records from the store', () => {
      let records = store.getters.all;
      expect(records.length).toEqual(0);
    });

    it('removes all related records', () => {
      let related = store.state.related;
      expect(related.length).toEqual(0);
    });

    it('removes all filtered records', () => {
      let filtered = store.state.filtered;
      expect(filtered.length).toEqual(0);
    });

    it('sets the status to INITIAL_STATE', () => {
      expect(store.state.status).toEqual('INITIAL');
    });
  });
});
