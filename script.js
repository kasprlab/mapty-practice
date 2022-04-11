'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);//review 238

  constructor(coords, distance, duration){
    this.coords = coords; // [lat, lang]
    this.distance = distance; //km
    this.duration = duration; //min
  }
}

class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence){
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    // mins/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling'

  constructor(coords, distance, duration, elevationGain){
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}


///////////////////////////////////////////////////////////////
// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map; //private class field
  #mapEvent; //private class field
  #workouts = []; //private class field

  constructor() { //constructor call immediately when an app object is called when the script loads
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField) 
  }

  _getPosition() {

    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), 
        function(){
          alert('unable to find location')
        }
      );
    }
  }

  _loadMap(position) {
      const {latitude} = position.coords
      const {longitude} = position.coords
      const coords = [latitude, longitude]

      console.log(this)

      this.#map = L.map('map').setView(coords, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.#map);

      //handling clicks on map
      this.#map.on('click', this._showForm.bind(this));    

  }

  _showForm(mapE) {

    form.classList.remove('hidden')
    inputDistance.focus()
    this.#mapEvent = mapE

  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
  }

  _newWorkout(e) {
  
      e.preventDefault()

      // get data from the form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const {lat, lng} = this.#mapEvent.latlng;
      let workout;
      
      const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input)) //helper function
      const positiveInputs = (...inputs) => inputs.every(input => input > 0) //helper function

      // if running, create running object
      if(type === 'running'){
        
        const cadence = +inputCadence.value;

        // check if data is valid
        if(!validInputs(distance, duration, cadence) || !positiveInputs(distance, duration, cadence)) //guard clause
          return alert ('Inputs have to be positive numbers!') 

        workout = new Running([lat, lng], distance, duration, cadence);
      }

      // if cycling, create cycling object
      if(type === 'cycling'){
        
        const elevation = +inputElevation.value;

        // check if data is valid
        if(!validInputs(distance, duration, elevation) || !positiveInputs(distance, duration)) //guard clause
          return alert ('Inputs have to be positive numbers!') 
      
        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // Add new object to workout array
      this.#workouts.push(workout)
      console.log(workout)

      // render workout on map as a marker
      this.renderWorkoutMarker(workout)

      // render workout on list
    
      // hide form + clear input fields
      inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

  }

  renderWorkoutMarker(workout) {
    L.marker(workout.coords)
    .addTo(this.#map)
    .bindPopup(L.popup({
      maxWidth:250, 
      minWidth:150, 
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`
      })
    )
    .setPopupContent('workout')
    .openPopup();
  }
}

const app = new App();



