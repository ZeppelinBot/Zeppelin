const knexfile = require("../knexfile");
import * as knex from "knex";

const db = knex(knexfile);

export default db;
