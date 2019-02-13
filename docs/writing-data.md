# Writing Data

## create / lastCreated

To create records on the server and also store it locally, use the `create` action. Pass it an object containing an `attributes` object. This is similar to a JSON:API record, but you don't need to specify the type -- the store will add the type.

```javascript
const recordData = {
  attributes: {
    title: 'My Widget',
  },
};
this.$store.dispatch('widgets/create', recordData);
```

You can also save relationships by providing a `relationships` attribute, just like in the JSON:API spec:

```javascript
const recordData = {
  attributes: {
    title: 'My Widget',
  },
  relationships: {
    category: {
      data: {
        type: 'categories',
        id: 42,
      },
    },
  },
};
this.$store.dispatch('widgets/create', recordData);
```

After creating a record, it is available via the `lastCreated` getter. This allows you to access an auto-generated `id` returned by the server, as well as any other fields the server populates:

```javascript
this.$store.dispatch('widgets/create', recordData).then(() => {
  const widget = this.$store.getters['widgets/lastCreated'];
  console.log(widget);
});
```

## update

To update records, pass the entire updated record object to the `update` action:

```javascript
const widget = this.$store.getters['widgets/byId']({ id: 42 });
widget.attributes.title = 'Updated Title';
this.$store.dispatch('widgets/update', widget);
```

## delete

To delete, pass either a full record or just an object with an ID field:

```javascript
const widgetIdObject = { id: 42 };
this.$store.dispatch('widgets/delete', widgetIdObject);
```
