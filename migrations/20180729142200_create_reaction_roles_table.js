exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable('reaction_roles')) {
    await knex.schema.createTable('reaction_roles', table => {
      table.string('guild_id', 20).notNullable();
      table.string('channel_id', 20).notNullable();
      table.string('message_id', 20).notNullable();
      table.string('emoji', 20).notNullable();
      table.string('role_id', 20).notNullable();

      table.primary(['guild_id', 'channel_id', 'message_id', 'emoji']);
      table.index(['message_id', 'emoji']);
    });
  }
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('reaction_roles');
};
