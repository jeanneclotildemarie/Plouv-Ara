const gradients = [
    ['--background-blue',   '--background-orange'],
    ['--background-blue',   '--background-red'   ],
    ['--background-blue',   '--background-purple'],
    ['--background-yellow', '--background-orange'],
    ['--background-yellow', '--background-purple'],
];

const randomIndex = Math.floor(Math.random() * gradients.length);
const [topColor, bottomColor] = gradients[randomIndex];

document.documentElement.style.setProperty('--gradient-top',    `var(${topColor})`);
document.documentElement.style.setProperty('--gradient-bottom', `var(${bottomColor})`);
