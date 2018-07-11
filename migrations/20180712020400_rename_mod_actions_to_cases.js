exports.up = async function(knex) {
  await knex.schema.renameTable('mod_actions', 'cases');
  await knex.schema.renameTable('mod_action_notes', 'case_notes');
  await knex.schema.table('cases', table => {
    table.renameColumn('action_type', 'type');
  });
  await knex.schema.table('case_notes', table => {
    table.renameColumn('mod_action_id', 'case_id');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('cases', table => {
    table.renameColumn('type', 'action_type');
  });
  await knex.schema.table('case_notes', table => {
    table.renameColumn('case_id', 'mod_action_id');
  });
  await knex.schema.renameTable('cases', 'mod_actions');
  await knex.schema.renameTable('case_notes', 'mod_action_notes');
};
