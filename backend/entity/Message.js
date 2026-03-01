const EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
    name: "Message",
    tableName: "messages",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true
        },
        sessionId: {
            type: "varchar",
            length: 255
        },
        role: {
            type: "enum",
            enum: ['user', 'model']
        },
        content: {
            type: "text"
        },
        created_at: {
            type: "timestamp",
            createDate: true
        }
    }
});
