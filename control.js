"use strict";

var slider = document.querySelector("#slider_square_number");
var label = document.querySelector("#label_square_number");

// Update the label to show the current slider value
slider.oninput = function() {
    label.textContent = "num: " + this.value;  // Update label text dynamically
    // random_square(this.value)
}


document.querySelector('#runButton').addEventListener('click', function() {
    var sliderValue = slider.value;
    if (typeof random_square === "function") {
        random_square(sliderValue);
    } else {
        console.log('The function random_square is not defined.');
    }
});