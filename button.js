"use strict"

document.querySelector('#runButton').addEventListener('click', function() {
    if (typeof random_square === "function") {
        random_square();
    } else {
        console.log('The function random_square is not defined.');
    }
});