exports.up = async function(knex) {
  if (! await knex.schema.hasTable('tags')) {
    await knex.schema.createTable('tags', table => {
      table.bigInteger('guild_id').unsigned().notNullable();
      table.string('tag', 64).notNullable();
      table.bigInteger('user_id').unsigned().notNullable();
      table.text('body').notNullable();
      table.dateTime('created_at').defaultTo(knex.raw('NOW()'));

      table.primary(['guild_id', 'tag']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('tags');
};
