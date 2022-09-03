import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
    db = mongoClient.db("UOL_API")
})

const nameSchema = joi.object({
    name: joi.string().required()
})

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid('message', 'private_message'),
    time: joi.string().required()
})

function filterMessage(message, user) {
    if (message.type === 'private_message') {
        if (message.from === user || message.to === user){
            return true;
        } else {
            return false;
        }
    }
    return true;
}

function maxMessages(index, limit, length) {
    if (!isNaN(limit)) {
        if (index >= length - limit) {
            return true;
        } else {
            return false;
        }
    } else {
       return true 
    }
}

//Participants

app.post('/participants', async (req, res) =>{

    const { name } = req.body;

    const validation = nameSchema.validate({name});
    if(validation.error){
        res.status(422).send(validation.error.details[0].message);
        return;
    }

    try {
        const userSameName = await db.collection('participants').findOne({name});
        if(userSameName){
            res.status(409).send("Usuário já cadastrado");
            return;
        }
    } catch (error) {
        res.status(500).send(error);
        return;
    }
    
    try {
        await db.collection('participants').insertOne({
            name,
            lastStatus: Date.now()
        })
        res.sendStatus(201);
    } catch (error) {
        res.status(500).send(error);
        return;
    } 

    try {
        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })
    } catch (error) {
        console.log(error);
    }

})

app.get('/participants', async (req, res) =>{

    try {
        const participants = await db.collection('participants').find().toArray();
        res.send(participants);
    } catch (error) {
        res.status(500).send(error)
    }

})

//Messages

app.post('/messages', async (req, res) => {

    const { to, text, type } = req.body;
    const { user } = req.headers;

    const message = {from: user, to, text, type, time: dayjs().format('HH:mm:ss')}

    const validation = messageSchema.validate(message, {abortEarly: false});

    if(validation.error){
        res.status(422).send(validation.error.details.map(err => err.message));
        return;
    }

    try {
        const validName = await db.collection('participants').findOne({name: user});
        if (!validName){
            res.status(422).send('Usuário inválido');
            return;
        }
    } catch (error) {
        res.status(500).send(error);
        return;
    }

    try {
        await db.collection('messages').insertOne(message);
        res.sendStatus(201);
    } catch (error) {
        res.status(500).send(error)
    }
})

app.get('/messages', async (req, res) => {

    const limit = parseInt(req.query.limit);
    const { user } = req.headers;

    try {
        const messages = await db.collection('messages').find().toArray();
        let filteredMessages = messages.filter(message => filterMessage(message, user));
        filteredMessages = filteredMessages.filter((message, index) => maxMessages(index, limit, filteredMessages.length));
        res.send(filteredMessages)
    } catch (error) {
        res.status(500).send(error)
    }

})

//Status

app.post('/status', async (req, res) => {

    const { user } = req.headers;

    try {
        const validName = await db.collection('participants').findOne({name: user});
        if (!validName){
            res.sendStatus(404);
            return;
        }
    } catch (error) {
        res.status(500).send(error);
        return;
    }

    try {
        await db.collection('participants').updateOne({
            name: user
        }, {
            $set: {lastStatus: Date.now()}
        })
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send(error);
    }
})

app.listen('5000', () => console.log('Listening on 5000'))