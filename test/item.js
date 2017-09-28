import './testenv';
import Item from '../src/db/item';
import createMongoConnection from '../src/db/connection';
import dummyItem from './mocks/profile.json';


describe('Item', function () {
  this.timeout(6000);

  before(() => {
    createMongoConnection();
  });

  describe('Model', () => {
    before(async () => {
      await Item.remove();
    });

    it('should create a new item', (done) => {
      Item.create(dummyItem, done);
    });

    it('should delete a item', (done) => {
      Item.remove({ key: dummyItem.key }, (err, count) => {
        if (err) {
          done(err);
          return;
        }
        if (count === 0) {
          done(new Error('No items deleted'));
          return;
        }
        done();
      });
    });
  });

  describe('Statics', () => {
    beforeEach(async () => {
      await Item.remove();
    });

    it('should insert a new item', async () => {
      const op = await Item.upsert(dummyItem);

      if (op !== 'created') {
        throw new Error('Item is not new');
      }
    });

    it('should update an existing item', async () => {
      const op = await Item.upsert(dummyItem);

      if (op !== 'created') {
        throw new Error('Item is not new');
      }

      const newItem = { ...dummyItem, name: 'Name should have changed' };
      const op2 = await Item.upsert(newItem);

      if (op2 !== 'updated') {
        throw new Error('Item is new');
      }

      await Item.remove();
    });
  });
});
