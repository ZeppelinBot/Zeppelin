exports.up = async function(knex) {
  if (! await knex.schema.hasTable('mutes')) {
    await knex.schema.createTable('mutes', table => {
      table.bigInteger('guild_id').unsigned().notNullable();
      table.bigInteger('user_id').unsigned().notNullable();
      table.dateTime('created_at');
      table.dateTime('expires_at');

      table.primary(['guild_id', 'user_id']);
      table.index(['expires_at']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('mutes');
};
