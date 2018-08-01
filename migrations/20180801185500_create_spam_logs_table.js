exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable('spam_logs')) {
    await knex.schema.createTable('spam_logs', table => {
      table.string('id', 36).notNullable().primary();
      table.string('guild_id', 20).notNullable();
      table.text('body', 'mediumtext').notNullable();
      table.dateTime('created_at').defaultTo(knex.raw('NOW()')).notNullable();
      table.dateTime('expires_at').nullable();
    });
  }
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('spam_logs');
};
