import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';

const router = express.Router();

// MongoDB schema for journal entries
const entrySchema = new mongoose.Schema({
    city: String,
    weather: String,
    temperature: Number,
    mood: String,
    date: { type: Date, default: Date.now }
});

const Entry = mongoose.model('Entry', entrySchema);

// GET route - show journal page
router.get('/', async (req, res) => {
    const entries = await Entry.find();
    res.render('index', { entries });
});

// POST route - create a new journal entry
router.post('/add', async (req, res) => {
    const { city, mood } = req.body;

    // Fetch weather data from OpenWeatherMap API
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`);
        const weatherData = response.data;

        // Create a new journal entry
        const newEntry = new Entry({
            city: weatherData.name,
            weather: weatherData.weather[0].description,
            temperature: weatherData.main.temp,
            mood
        });
        await newEntry.save();

        res.redirect('/');
    } catch (error) {
        console.error("Error fetching weather data:", error);
        res.redirect('/');
    }
});

// DELETE route - remove a journal entry
router.post('/delete/:id', async (req, res) => {
    await Entry.findByIdAndDelete(req.params.id);
    res.redirect('/');
});

export default router;
