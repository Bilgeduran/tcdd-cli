const api_url = "https://api-yebsp.tcddtasimacilik.gov.tr";
const trips_endpoint = "/sefer/seferSorgula";
const stations_endpoint = "/istasyon/istasyonYukle";
const wagons_endpoint = "/vagon/vagonHaritasindanYerSecimi";
var found = false;
var audio = new Audio('kalabaks.mp3');
let stationsData = {};

const headers = {
    'Authorization': 'Basic ZGl0cmF2b3llYnNwOmRpdHJhMzQhdm8u',
    'Content-Type': 'application/json'
};

var config = {
    binisIstasyonAdi: "Eskişehir",
    inisIstasyonAdi: "Ankara Gar",
    date: "2024-09-23",
    hour: "19:35 - 20:53",
    seatType: "Economy"
};

function postRequest(url, body) {
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: headers
    })
    .then(response => response.json())
    .catch(error => console.error('Error:', error));
}

async function loadStations() {
    if (Object.keys(stationsData).length === 0) {
        document.getElementById("status").innerHTML = "Fetching stations... " + "<br />";
        const url = api_url + stations_endpoint;
        const body = {
            "kanalKodu": "3",
            "dil": 1,
            "tarih": "Nov 10, 2011 12:00:00 AM",
            "satisSorgu": true
        };
    
        const response = await postRequest(url, body);
        if (response && response.istasyonBilgileriList) {
            stationsData = response.istasyonBilgileriList.reduce((acc, station) => {
                acc[station.istasyonAdi] = station.istasyonId;
                return acc;
            }, {});
            console.log('Stations are updated.');
            document.getElementById("status").innerHTML = "Stations loaded. " + "<br />";
        } else {
            console.error('Failed to fetch stations: ', response);
        }
    }
    return stationsData;
}


function formatDate(date) {
    const parsedDate = new Date(date);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return parsedDate.toLocaleDateString('en-US', options);
}


loadStations();
const stations = stationsData;

function getTripHours() {
    const checkboxes = document.querySelectorAll('#hourChoices input[type="checkbox"]:checked');
    const selectedHours = Array.from(checkboxes).map(checkbox => checkbox.value.substring(0,5));
    console.log("Selected hours: ", selectedHours);
    document.getElementById("status").innerHTML = "Searching trips: " + selectedHours + "<br />";
    return selectedHours;
}

async function fetchTrips() {
    getTripHours();
    const body = {
        kanalKodu: 3,
        dil: 0,
        seferSorgulamaKriterWSDVO: {
            satisKanali: 3,
            binisIstasyonu: config.binisIstasyonAdi,
            inisIstasyonu: config.inisIstasyonAdi,
            binisIstasyonId: stations[config.binisIstasyonAdi],
            inisIstasyonId: stations[config.inisIstasyonAdi],
            binisIstasyonu_isHaritaGosterimi: false,
            inisIstasyonu_isHaritaGosterimi: false,
            seyahatTuru: 1,
            gidisTarih: `${formatDate(config.date)} 00:00:00 AM`,
            bolgeselGelsin: false,
            islemTipi: 0,
            yolcuSayisi: 1,
            aktarmalarGelsin: true,
        }
    };

    const response = await postRequest(api_url+trips_endpoint, body);
    
    if (response && response.cevapBilgileri.cevapKodu === '000') {
        const selectedHours = getTripHours();

        response.seferSorgulamaSonucList.forEach(trip => {
            const seferTime = new Date(trip.binisTarih);
            const seferTimeString = `${seferTime.getHours().toString().padStart(2, '0')}:${seferTime.getMinutes().toString().padStart(2, '0')}`;

            if (selectedHours.includes(seferTimeString)) {
                checkTrip(trip);
            }
        });
    }
    if (!found) { 
        //document.getElementById("status").innerHTML = ''
        document.getElementById("status").innerHTML += '.';
    }
}

var logInner = document.getElementById("log").innerHTML

function checkTrip(trip) {
    let seatType = document.getElementById('seatType').value;
    let disabled_seat_count = 0;
    let economy_seat_count = 0;
    let business_seat_count = 0;
    trip.vagonTipleriBosYerUcret.forEach(vagon => {
        if (vagon.vagonTipId == 17002) {
            disabled_seat_count += vagon.kalanEngelliKoltukSayisi;
            economy_seat_count += vagon.kalanSayi - disabled_seat_count;
        } else {
            business_seat_count += vagon.kalanSayi;
        }
    });
    if (seatType === "economy" && economy_seat_count > 0) {
        document.getElementById("status").innerHTML = `Seats Available for: ${trip.binisTarih}  💺:${economy_seat_count} ♿:${disabled_seat_count} 🛄:${business_seat_count} <br/>`;
        found = true;
    audio.play();
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const stationsData = await loadStations();
    const binisSelect = document.getElementById('binisIstasyonAdi');
    const inisSelect = document.getElementById('inisIstasyonAdi');

    Object.keys(stationsData).forEach(stationName => {
        const option = new Option(stationName, stationName);
        binisSelect.options.add(option);
        inisSelect.options.add(option.cloneNode(true)); 
    });
    binisSelect.value = config.binisIstasyonAdi;
    inisSelect.value = config.inisIstasyonAdi;
    seatType.value = config.seatType;
    var todaysDate = new Date();

    var day = String(todaysDate.getDate()).padStart(2, '0');
    var month = String(todaysDate.getMonth() + 1).padStart(2, '0');
    var year = todaysDate.getFullYear();

    var dateStr = `${year}-${month}-${day}`; 
    document.getElementById('date').value = dateStr;

    prefetchForHours();
    document.getElementById('binisIstasyonAdi').addEventListener('change', prefetchForHours);
    document.getElementById('inisIstasyonAdi').addEventListener('change', prefetchForHours);
    document.getElementById('date').addEventListener('change', prefetchForHours);
});

async function prefetchForHours() {
    const hourContainer = document.getElementById('hourChoices');
    hourContainer.innerHTML = ''; 

    config = {
        binisIstasyonAdi: document.getElementById('binisIstasyonAdi').value,
        inisIstasyonAdi: document.getElementById('inisIstasyonAdi').value,
        date: document.getElementById('date').value,
    };
    console.log('Configuration updated:', config);
    const body = {
        kanalKodu: 3,
        dil: 0,
        seferSorgulamaKriterWSDVO: {
            satisKanali: 3,
            binisIstasyonu: config.binisIstasyonAdi,
            inisIstasyonu: config.inisIstasyonAdi,
            binisIstasyonId: stations[config.binisIstasyonAdi],
            inisIstasyonId: stations[config.inisIstasyonAdi],
            binisIstasyonu_isHaritaGosterimi: false,
            inisIstasyonu_isHaritaGosterimi: false,
            seyahatTuru: 1,
            gidisTarih: `${formatDate(config.date)} 00:00:00 AM`,
            bolgeselGelsin: false,
            islemTipi: 0,
            yolcuSayisi: 1,
            aktarmalarGelsin: true,
        }
    };
    console.log(body);
    const response = await postRequest(api_url+trips_endpoint, body);
    if (response && response.cevapBilgileri && response.cevapBilgileri.cevapKodu === '000') {
        updateHourDropdown(response.seferSorgulamaSonucList);
    } else {
        const hourContainer = document.getElementById('hourChoices');
        hourContainer.innerHTML = "Station pair does not have any available trip.<br/>Check your preferences and try again.";
    }
}

// To format and update selections
function updateHourDropdown(trips) {
    const hourContainer = document.getElementById('hourChoices');
    hourContainer.innerHTML = '';

    const times = trips.map(trips => {
        const departureTime = new Date(trips.binisTarih).toTimeString().substring(0, 5);
        const arrivalTime = new Date(trips.inisTarih).toTimeString().substring(0, 5);
        const tripTime = departureTime + " - " + arrivalTime;
        return tripTime
    }).sort((a, b) => a.localeCompare(b)); // Sort times

    [...new Set(times)].forEach(time => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = time;
        checkbox.name = 'hour';
        checkbox.value = time;

        const label = document.createElement('label');
        label.htmlFor = time;
        label.appendChild(document.createTextNode(time));

        const wrapper = document.createElement('div');
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);

        hourContainer.appendChild(wrapper);
    });
}

function randomSleep(min, max) {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        document.getElementById('delayMessage').innerText = `Waiting for ${delay} seconds before next request...`;
        setTimeout(resolve, delay * 1000);
    });
}

async function startSearch(){
    found = false
    config = {
        binisIstasyonAdi: document.getElementById('binisIstasyonAdi').value,
        inisIstasyonAdi: document.getElementById('inisIstasyonAdi').value,
        date: document.getElementById('date').value,
    };

    const selectedHours = getTripHours();
    if (selectedHours.length == 0) { alert("Please select one or more hours"); return; }

    while (!found) {
        //document.getElementById("status").innerHTML += 'Searching...<br />';
        await fetchTrips();
        
        // Sleep for a random time between 8 and 42 seconds
        await randomSleep(8, 42);
    }
    for (let i = 0; i < 4; i++) {
        setTimeout(function() {
            audio.play();
        }, 4000 * i);
    }
    
}
