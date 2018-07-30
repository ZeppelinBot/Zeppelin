exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable('persisted_data')) {
    await knex.schema.createTable('persisted_data', table => {
      table.string('guild_id', 20).notNullable();
      table.string('user_id', 20).notNullable();
      table.string('roles', 1024).nullable().defaultTo(null);
      table.string('nickname', 255).nullable().defaultTo(null);
      table.integer('is_voice_muted').notNullable().defaultTo(0);

      table.primary(['guild_id', 'user_id']);
    });
  }
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('persisted_data');
};
