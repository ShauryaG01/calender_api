const app = require('express')()

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), listEvents);
});

function authorize(credentials, callback) {

    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}


function listEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });

    var event = {
        'summary': 'job 1',
        'location': 'India',
        'description': 'lorem epsum lorem epsum',
        'start': {
            'dateTime': '2022-04-26T01:00:00-07:00',
            'timeZone': 'Asia/Kolkata',
        },
        'end': {
            'dateTime': '2022-04-26T02:00:00-07:00',
            'timeZone': 'Asia/Kolkata',
        },
    };

    calendar.events.insert({
        auth: auth,
        calendarId: 'primary',
        resource: event,
    }, function(err, event) {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created: %s', event.data.htmlLink);
    });

    calendar.events.list({
        calendarId: 'primary',
        // timeMin: from date
        timeMin: (new Date()).toISOString(),

        //timeMax: to date
        timeMax: '2022-04-26T02:00:00-07:00',
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const events = res.data.items;
        if (events.length) {
            console.log('Upcoming 10 events:');
            events.map((event, i) => {
                const start = event.start.dateTime || event.start.date;
                console.log(`${start} - ${event.summary}`);
            });
        } else {
            console.log('No upcoming events found.');
        }
    });
}


app.get('/', (req, res) => {
    res.send('Server is working!')
})

app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message })
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server is up on port ` + port)
})