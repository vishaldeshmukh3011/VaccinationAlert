let nodemailer = require('nodemailer');
const moment = require('moment');
const cron = require('node-cron');
const axios = require('axios');
const {daysToCheck, AGE, PINCODE} = require("./constants");
const URL = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin"
async function check() {
    try {
        cron.schedule('*/30 * * * *', async () => {
            await vaccineCheck();
        });
    } catch (e) {
        console.log('Error: ' + e.stack);
    }
}

async function vaccineCheck() {

    let datesArray = await fetchNextNDays(daysToCheck);
    datesArray.forEach(date => {
        checkSlots(date);
    })
}

async function fetchNextNDays(dayToCheck) {
    let dates = [];
    let today = moment();
    for (let i = 0; i < dayToCheck; i++) {
        let dateString = today.format('DD-MM-YYYY')
        dates.push(dateString);
        today.add(1, 'day');
    }
    return dates;
}

function checkSlots(dateToCheck) {
    let config = {
        method: 'get',
        url: `${URL}?pincode=${PINCODE}&date=${dateToCheck}`,
        headers: {
            'accept': 'application/json'
        }
    };

    axios(config)
        .then(function (slots) {
            let sessions = slots.data.sessions;
            let validSlots = sessions.filter(slot => slot.min_age_limit <= AGE && slot.available_capacity > 0)
            if (validSlots.length > 0) {
                console.log("slots found")
                //console.log(validSlots)
                sendEmail(validSlots, dateToCheck, (err, result) => {
                    if (err) {
                        console.error({ err });
                    }
                });
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}

function sendEmail(validSlots, date, callback){
    let message = createTemplate(validSlots, date)
    let nodemailerTransporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: String('vishal5167@gmail.com'),
            pass: String('V@cognizant05')
        }
    });
    let options = {
        from: String('Vaccine Checker ' + ""),
        to: "vishal5167@gmail.com",
        subject: "Vaccination Alert",
        html: message
    };
    nodemailerTransporter.sendMail(options, (error, info) => {
        if (error) {
            return callback(error);
        }
        callback(error, info);
    });
}

function createTemplate(slotDetails, date) {
    let message = `Hi, 
    <br/>
    Vaccine is available on <strong> ${date} </strong> in the following centers: 
    <br/><br/>
    `
    for (const slot of slotDetails) {
        console.log(slot)
        let slotBody = `<strong> Center Name: ${slot.name} </strong> <br/>
        Location: ${slot.block_name}, ${slot.state_name}, ${slot.pincode} <br/>
        From ${slot.from} to ${slot.to} <br/>
        Fee Type: ${slot.fee_type} <br/>
        Fee: ${slot.fee} rupees <br/>
        Available Capacity: ${slot.available_capacity} doses available <br/>
        Vaccine: ${slot.vaccine} <br/>
        Slots Available: <br/>`
        for (const x of slot.slots) {
            slotBody = `${slotBody} ${x} <br/>`
        }
        slotBody = `${slotBody} <br/><br/>`
        message = `${message} ${slotBody}`
    }

    return message
}

check()
    .then(() => { console.log('job started....'); });