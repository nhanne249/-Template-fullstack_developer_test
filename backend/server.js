require("reflect-metadata");
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AppDataSource } = require('./config/data-source');
const MessageEntity = require('./entity/Message');
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chat API with Google Gemini',
            version: '1.0.0',
            description: 'Simple backend for contextual chat using Google Gemini AI and TypeORM',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Local server',
            }
        ],
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

AppDataSource.initialize().then(async () => {
    console.log("Database connected via TypeORM");
    const messageRepo = AppDataSource.getRepository(MessageEntity);

    /**
     * @swagger
     * /api/chat:
     *   post:
     *     summary: Send a chat message to Gemini AI
     *     description: Sends a message and returns the AI response. Stores conversation in database tied to the sessionId.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               message:
     *                 type: string
     *                 description: The user's input message
     *               sessionId:
     *                 type: string
     *                 description: Unique sessionID. Optional; backend generates one if not provided.
     *             example:
     *               message: "Hello world"
     *               sessionId: "123e4567-e89b-12d3-a456-426614174000"
     *     responses:
     *       200:
     *         description: Response from Gemini AI
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 sessionId:
     *                   type: string
     *                 role:
     *                   type: string
     *                   example: "model"
     *                 content:
     *                   type: string
     *       400:
     *         description: Bad request (missing message)
     *       500:
     *         description: Server error
     */
    app.post('/api/chat', async (req, res) => {
        let { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!sessionId) {
            sessionId = uuidv4();
        }

        try {
            const userMsg = messageRepo.create({ sessionId, role: 'user', content: message });
            await messageRepo.save(userMsg);

            const history = await messageRepo.find({
                where: { sessionId: sessionId },
                order: { created_at: "ASC" },
                take: 20
            });

            const formattedHistory = history.map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            const historyWithoutCurrent = formattedHistory.slice(0, -1);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

            const chatSession = model.startChat({
                history: historyWithoutCurrent,
            });

            const result = await chatSession.sendMessage(message);
            const responseText = result.response.text();

            const modelMsg = messageRepo.create({ sessionId, role: 'model', content: responseText });
            await messageRepo.save(modelMsg);

            res.json({ sessionId, role: 'model', content: responseText });
        } catch (error) {
            console.error('Gemini/DB API Error:', error);
            res.status(500).json({ error: 'Failed to process chat message' });
        }
    });

    /**
     * @swagger
     * /api/history:
     *   get:
     *     summary: Fetch chat history for a session
     *     description: Retrieve conversation history by providing a valid sessionId.
     *     parameters:
     *       - in: query
     *         name: sessionId
     *         required: true
     *         schema:
     *           type: string
     *         description: The session identifier to fetch history for
     *     responses:
     *       200:
     *         description: Array of past chat messages
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   sessionId:
     *                     type: string
     *                   role:
     *                     type: string
     *                   content:
     *                     type: string
     *                   created_at:
     *                     type: string
     *                     format: date-time
     *       400:
     *         description: Missing sessionId
     *       500:
     *         description: Server database error
     */
    app.get('/api/history', async (req, res) => {
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId query parameter is required' });
        }

        try {
            const history = await messageRepo.find({
                where: { sessionId: sessionId },
                order: { created_at: "ASC" },
                select: ["sessionId", "role", "content", "created_at"]
            });
            res.json(history);
        } catch (error) {
            console.error('Database Error:', error);
            res.status(500).json({ error: 'Failed to fetch chat history' });
        }
    });

    // Serve frontend static files in production
    const path = require('path');
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));

    app.get('/*splat', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });

    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
        console.log(`Swagger docs available at http://localhost:${port}/docs`);
    });

}).catch((error) => console.log("TypeORM connection error: ", error));
