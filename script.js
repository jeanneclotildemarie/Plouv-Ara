const gradients = [
    ['--background-blue', '--background-orange', '--blue'],
    ['--background-yellow', '--background-blue', '--blue'],
    ['--background-lavender', '--background-orange', '--purple'],
    ['--background-red', '--background-blue', '--red']
];

const randomIndex = Math.floor(Math.random() * gradients.length);
const [topColor, bottomColor, textColor] = gradients[randomIndex];

document.documentElement.style.setProperty('--gradient-top',    `var(${topColor})`);
document.documentElement.style.setProperty('--gradient-bottom', `var(${bottomColor})`);
document.documentElement.style.setProperty('--text', `var(${textColor})`);
