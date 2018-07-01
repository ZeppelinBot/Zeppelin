exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable('mod_actions')) {
    await knex.schema.createTable('mod_actions', table => {
      table.increments('id');
      table.bigInteger('guild_id').unsigned().notNullable();
      table.integer('case_number').unsigned().notNullable();
      table.bigInteger('user_id').index().unsigned().notNullable();
      table.string('user_name', 128).notNullable();
      table.bigInteger('mod_id').index().unsigned().nullable().defaultTo(null);
      table.string('mod_name', 128).nullable().defaultTo(null);
      table.integer('action_type').unsigned().notNullable();
      table.bigInteger('audit_log_id').unique().nullable().defaultTo(null);
      table.dateTime('created_at').index().defaultTo(knex.raw('NOW()')).notNullable();

      table.unique(['guild_id', 'case_number']);
    });
  }

  if (! await knex.schema.hasTable('mod_action_notes')) {
    await knex.schema.createTable('mod_action_notes', table => {
      table.increments('id');
      table.integer('mod_action_id').unsigned().notNullable().index().references('id').inTable('mod_actions').onDelete('CASCADE');
      table.bigInteger('mod_id').index().unsigned().nullable().defaultTo(null);
      table.string('mod_name', 128).nullable().defaultTo(null);
      table.text('body').notNullable();
      table.dateTime('created_at').index().defaultTo(knex.raw('NOW()')).notNullable();
    });
  }
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('mod_action_notes');
  await knex.schema.dropTableIfExists('mod_actions');
};
