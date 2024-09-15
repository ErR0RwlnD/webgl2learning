document.getElementById('runButton').addEventListener('click', function() {
    // Assuming there is a function in webgl_random_square.js that you want to trigger
    if (typeof random_square === "function") {
        random_square();  // Call the function to run the JS logic
    } else {
        console.log('The function random_square is not defined.');
    }
});