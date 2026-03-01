const { DataSource } = require("typeorm");
const fs = require('fs');
require('dotenv').config();

const sslConfig = process.env.DB_SSL_CA ? {
    ca: fs.readFileSync(process.env.DB_SSL_CA),
    rejectUnauthorized: true
} : {
    rejectUnauthorized: true
};

const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT,
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "chat_db",
    ssl: sslConfig,
    synchronize: true,
    logging: false,
    entities: [require("../entity/Message")],
});

module.exports = { AppDataSource };
