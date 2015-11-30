import './testenv';
import { extend } from 'lodash';
import Item from '../src/db/Item';
import dummyItem from './mocks/profile.json';

describe('Item', function() {
  this.timeout(6000);

  describe('Model', function() {
    before(async () => {
      await Item.remove();
    });

    it('should create a new item', (done) => Item.create(dummyItem, done));

    it('should delete a item', (done) => {
      Item.remove({ key: dummyItem.key }, (err, count) => {
        if (err) return done(err);
        if (count === 0) return done(new Error('No items deleted'));
        done();
      });
    });
  });

  describe('Statics', function() {
    before(async () => {
      await Item.remove();
    });

    it('should insert a new item', async () => {
      const op = await Item.upsert(dummyItem);

      if (op !== 'created') {
        throw new Error('Item is not new');
      }
    });

    it('should update an existing item', async () => {
      const newItem = extend({}, dummyItem, {
        name: 'Name should have changed'
      });

      const op = await Item.upsert(newItem);

      if (op !== 'updated') {
        throw new Error('Item is new');
      }

      await Item.remove();
    });
  });
});
