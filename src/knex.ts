const knexfile = require("../knexfile");
import knex from "knex";

const db = knex(knexfile);

export default db;
