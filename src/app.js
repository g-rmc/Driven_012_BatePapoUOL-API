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

const nameSchema = joi.string();

/*

Participante: 
{
    name: 'João',
    lastStatus: 12313123
}

Mensagem:
{
    from: 'João',
    to: 'Todos',
    text: 'oi galera',
    type: 'message',
    time: '20:04:37'
}

*/

app.post('/participants', async (req, res) =>{

    const { name } = req.body;

    const validation = nameSchema.validate(name);
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
        res.status(400).send(error);
        return;
    }
    
    try {
        await db.collection('participants').insertOne({
            name,
            lastStatus: Date.now()
        })
        res.sendStatus(201);
    } catch (error) {
        res.status(400).send(error);
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

    /*
    try {
        const messages = await db.collection('messages').find().toArray();
        console.log(messages)
    } catch (error) {
        console.log(error)
    } */
})

app.get('/participants', async (req, res) =>{

    try {
        const participants = await db.collection('participants').find().toArray();
        res.send(participants);
    } catch (error) {
        res.status(400).send(error)
    }

})

app.listen('5000', () => console.log('Listening on 5000'))