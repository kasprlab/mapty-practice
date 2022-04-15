'use strict';

let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);//review 238
  clicks = 0;

  constructor(coords, distance, duration){
    this.coords = coords; // [lat, lang]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence){
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
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
    this._setDescription();
    
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
  #mapZoomLevel = 13;

  constructor() { //constructor call immediately when an app object is called when the script loads
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attached event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
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

      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.#map);

      //handling clicks on map
      this.#map.on('click', this._showForm.bind(this));  
      
      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });

  }

  _showForm(mapE) {
    form.classList.remove('hidden')
    inputDistance.focus()
    this.#mapEvent = mapE
  }

  _hideForm() {
    // empty input
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000)
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
      this.#workouts.push(workout);

      // render workout on map as a marker
      this._renderWorkoutMarker(workout);

      // render workout on list
      this._renderWorkout(workout);
    
      // hide form + clear input fields
      this._hideForm();

      // set local storage to all workouts
      this._setLocalStorage();

  }

  _renderWorkoutMarker(workout) {
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
    .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
    .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if(workout.type === 'running')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `

    if(workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

      form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')

    if(!workoutEl) return; // guard clause

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)
    console.log(workout)

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate:true,
      pan:{
        duration: 1
      }
    });

    // using public interface
    //workout.click()
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data; //restoring data from local storage

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload()
  }

}

const app = new App();



