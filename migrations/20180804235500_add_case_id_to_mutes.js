exports.up = async function(knex, Promise) {
  await knex.schema.table('mutes', table => {
    table.integer('case_id').unsigned().nullable().defaultTo(null).after('user_id').references('id').inTable('cases').onDelete('SET NULL');
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table('mutes', table => {
    table.dropForeign('case_id');
    table.dropColumn('case_id');
  });
};
