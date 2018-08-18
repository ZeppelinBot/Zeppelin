exports.up = async function(knex) {
  await knex.schema.renameTable('spam_logs', 'archives');
};

exports.down = async function(knex) {
  await knex.schema.renameTable('archives', 'spam_logs');
};
