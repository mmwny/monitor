const path = require('path');
const { remote } = require('electron');
const knex = require('knex');
const sqlite3 = require('sqlite3');
const { app } = remote;

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(app.getPath('userData'), 'monitor.sqlite')
  },
  useNullAsDefault: true
});


db.schema.hasTable('tasks').then(exists => {
  if (!exists) {
    return db.schema.createTable('tasks', table => {
      table.increments('id').primary();
      table.string('task_text');
      table.boolean('complete');
      table.timestamps();
    })
  }
})

module.exports = db;

