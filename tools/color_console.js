function logger(text, colorCode=37, bgCode) {
   
  console.log(
    `${bgCode ? `\x1b[` + bgCode+"m":""}\x1b[${colorCode}m${text}\x1b[0m`
  ); // Reset color after the text
}

// // Reset
// console.log('\x1b[0m', 'Reset');

// // Styles
// console.log('\x1b[1m', 'Bold');
// console.log('\x1b[3m', 'Italic');
// console.log('\x1b[4m', 'Underline');

// // Text colors
// console.log('\x1b[31m', 'Red');
// console.log('\x1b[32m', 'Green');
// console.log('\x1b[33m', 'Yellow');
// console.log('\x1b[34m', 'Blue');
// console.log('\x1b[35m', 'Magenta');
// console.log('\x1b[36m', 'Cyan');
// console.log('\x1b[37m', 'White');

// // Background colors
// console.log('\x1b[41m\x1b[37m', 'Red Background');
// console.log('\x1b[42m\x1b[37m', 'Green Background');
// console.log('\x1b[43m\x1b[30m', 'Yellow Background');
// console.log('\x1b[44m\x1b[37m', 'Blue Background');
// console.log('\x1b[45m\x1b[37m', 'Magenta Background');
// console.log('\x1b[46m\x1b[37m', 'Cyan Background');
// console.log('\x1b[47m\x1b[30m', 'White Background');

export { logger };
