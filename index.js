const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// http + socket
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// mongo
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bhsplac.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




async function run() {
    await client.connect();

    const db = client.db("singara-somucha");
    const allInfoCollection = db.collection("allInfo");


    console.log("MongoDB Connected");

    // post all info
    app.post("/create/singara-somucha", async (req, res) => {
        const allInfo = req.body;
        const result = await allInfoCollection.insertOne(allInfo);
        res.status(201).json({
            success: true,
            message: "Data saved successfully",
            insertedId: result.insertedId
        });
    }
    );

    // get all info
    app.get("/singara-somucha", async (req, res) => {
        const query = {};
        const cursor = allInfoCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    }
    );

    // Add name + role to a specific team/category
    app.post("/add-to-team", async (req, res) => {
        const { teamName, name, role } = req.body;

        if (!teamName || !name || !role) {
            return res.status(400).json({ success: false, message: "teamName, name, and role are required" });
        }

        try {
            // Check if team/category already exists
            const existingTeam = await allInfoCollection.findOne({ teamName });

            if (!existingTeam) {
                // If team doesn't exist, create new team with the first item
                const newTeam = {
                    teamName,
                    items: [{ name, role }]
                };
                const result = await allInfoCollection.insertOne(newTeam);
                return res.status(201).json({
                    success: true,
                    message: "Team created and item added successfully",
                    insertedId: result.insertedId
                });
            } else {
                // If team exists, push new item
                const result = await allInfoCollection.updateOne(
                    { teamName },
                    { $push: { items: { name, role } } }
                );
                return res.status(200).json({
                    success: true,
                    message: "Item added to existing team successfully",
                });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    });

}

run().catch(console.error);


// base route
app.get("/", (req, res) => {
    res.send("PC ↔ Mobile Pairing Server Running");
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
