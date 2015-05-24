require('./test-env');

import {extend, clone} from 'lodash';
import Item from '../lib/models/Item';
import dummyItem from './data/profile.json';

describe('Item', function() {
  this.timeout(6000);

  describe('Model', function() {
    before((done) => Item.remove(done));

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
    before((done) => Item.remove(done));

    it('should insert a new item', (done) => {
      Item.upsert(dummyItem, (err, op) => {
        if (err) return done(err);

        if (op !== 'created') {
          err = new Error('Item is not new');
          return done(err);
        }

        done();
      });
    });

    it('should update an existing item', (done) => {
      let newItem = extend(clone(dummyItem), {
        name: 'Name should have changed'
      });

      Item.upsert(newItem, (err, op) => {
        if (err) return done(err);

        if (op !== 'updated') {
          err = new Error('Item is new');
          return done(err);
        }

        Item.remove(done);
      });
    });
  });
});
